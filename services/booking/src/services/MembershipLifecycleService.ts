import { db } from '../config/firebase';
import { configuration } from './PaymentService';
import { MembershipAudience, MembershipReminderService } from './MembershipReminderService';
import { PayFastSubscriptionService } from './PayFastSubscriptionService';

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDER_MIDPOINT_MS = 3 * 24 * 60 * 60 * 1000;

function graceEndFor(data: Record<string, any>, now: number): { start: string; end: string } {
  const currentEnd = Date.parse(data.currentPeriodEnd || '');
  const storedStart = Date.parse(data.gracePeriodStart || '');
  const start = Number.isFinite(storedStart)
    ? storedStart
    : Math.max(Number.isFinite(currentEnd) ? currentEnd : now, now);
  const storedEnd = Date.parse(data.gracePeriodEnd || '');
  return {
    start: new Date(start).toISOString(),
    end: new Date(Number.isFinite(storedEnd) ? storedEnd : start + GRACE_PERIOD_MS).toISOString(),
  };
}

export class MembershipLifecycleService {
  private static running = false;

  static start() {
    if (this.running) return;
    this.running = true;
    const run = () => void this.sweep().catch(error => console.error('Membership lifecycle sweep failed:', error));
    run();
    setInterval(run, 60 * 60 * 1000).unref?.();
  }

  static async sweep() {
    const now = Date.now();
    await Promise.all([
      this.processAudience('patient', 'patientMemberships'),
      this.processAudience('doctor', 'doctorMemberships'),
      this.retrySupersededSubscriptions(),
    ]);
    console.info(`Membership lifecycle sweep completed at ${new Date(now).toISOString()}`);
  }

  private static async processAudience(audience: MembershipAudience, collectionName: string) {
    const snapshot = await db.collection(collectionName).where('status', '==', 'past_due').get();
    for (const document of snapshot.docs) {
      const data = document.data();
      const now = Date.now();
      const grace = graceEndFor(data, now);
      const graceEnd = Date.parse(grace.end);

      if (!data.gracePeriodStart || !data.gracePeriodEnd) {
        await document.ref.set({ gracePeriodStart: grace.start, gracePeriodEnd: grace.end, updatedAt: new Date().toISOString() }, { merge: true });
      }

      if (graceEnd <= now) {
        await db.runTransaction(async transaction => {
          const current = await transaction.get(document.ref);
          if (!current.exists || current.data()?.status !== 'past_due') return;
          transaction.update(document.ref, { status: 'expired', updatedAt: new Date().toISOString() });
          if (audience === 'doctor') {
            transaction.set(db.collection('doctors').doc(document.id), {
              membershipStatus: 'expired',
              membershipFeatured: false,
              membershipGracePeriodEnd: grace.end,
              membershipUpdatedAt: new Date().toISOString(),
            }, { merge: true });
          }
        });
        continue;
      }

      const periodEnd = String(data.currentPeriodEnd || grace.start);
      const elapsed = now - Date.parse(grace.start);
      const remaining = graceEnd - now;
      await MembershipReminderService.sendRenewalReminder({
        userId: document.id,
        audience,
        periodEnd,
        gracePeriodEnd: grace.end,
        stage: 'payment_failed',
      });
      const reminderStages: Array<'grace_midpoint' | 'grace_final'> = [];
      if (elapsed >= REMINDER_MIDPOINT_MS) reminderStages.push('grace_midpoint');
      if (remaining <= 24 * 60 * 60 * 1000) reminderStages.push('grace_final');
      for (const stage of reminderStages) {
        await MembershipReminderService.sendRenewalReminder({
          userId: document.id,
          audience,
          periodEnd,
          gracePeriodEnd: grace.end,
          stage,
        });
      }
    }
  }

  private static async retrySupersededSubscriptions() {
    const config = (() => {
      try { return configuration('live'); } catch { return null; }
    })();
    if (!config?.passphrase) return;

    for (const [collectionName, subscriptionsName] of [
      ['patientMemberships', 'patientMembershipSubscriptions'],
      ['doctorMemberships', 'doctorMembershipSubscriptions'],
    ] as const) {
      const snapshot = await db.collection(collectionName).get();
      for (const document of snapshot.docs) {
        const token = document.data().oldPayfastTokenToCancel;
        if (typeof token !== 'string' || !token) continue;
        try {
          await PayFastSubscriptionService.cancel(token, config);
          const now = new Date().toISOString();
          await db.collection(subscriptionsName).doc(token).set({ status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true });
          await document.ref.update({ oldPayfastTokenToCancel: null, updatedAt: now });
        } catch (error) {
          console.error('Could not cancel the superseded PayFast membership subscription; it will be retried:', error);
        }
      }
    }
  }
}
