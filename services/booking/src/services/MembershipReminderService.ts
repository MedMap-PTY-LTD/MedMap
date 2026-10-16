import { db } from '../config/firebase';

export type MembershipAudience = 'patient' | 'doctor';
export type MembershipReminderStage = 'payment_failed' | 'grace_midpoint' | 'grace_final';

function reminderCopy(audience: MembershipAudience, stage: MembershipReminderStage, graceEnd: string) {
  const audienceName = audience === 'doctor' ? 'provider' : 'patient';
  const endDate = new Date(graceEnd).toLocaleDateString('en-ZA', { dateStyle: 'long', timeZone: 'Africa/Johannesburg' });
  const title = stage === 'grace_final'
    ? 'Membership grace period ends soon'
    : stage === 'payment_failed'
      ? 'Membership renewal payment failed'
      : 'Membership payment still needs attention';
  const message = stage === 'grace_final'
    ? `Your ${audienceName} membership benefits remain available until ${endDate}. Update your PayFast payment details to keep them.`
    : `PayFast could not collect your ${audienceName} membership renewal. Your benefits remain available until ${endDate} while you resolve the payment.`;
  return { title, message };
}

function safeDocPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

export class MembershipReminderService {
  static async listForUser(userId: string) {
    const snapshot = await db.collection('users').doc(userId).collection('membershipNotifications')
      .orderBy('createdAt', 'desc').limit(10).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Membership update',
        message: data.message || '',
        createdAt: data.createdAt || null,
        read: data.read === true,
        stage: data.stage || null,
      };
    });
  }

  static async sendRenewalReminder(input: {
    userId: string;
    audience: MembershipAudience;
    periodEnd: string;
    gracePeriodEnd: string;
    stage: MembershipReminderStage;
  }): Promise<void> {
    const { title, message } = reminderCopy(input.audience, input.stage, input.gracePeriodEnd);
    const cycleKey = safeDocPart(String(Date.parse(input.periodEnd) || input.periodEnd));
    const notificationRef = db.collection('users').doc(input.userId).collection('membershipNotifications')
      .doc(`${input.audience}_${cycleKey}_${input.stage}`);
    const now = new Date().toISOString();
    let shouldSendEmail = false;

    await db.runTransaction(async transaction => {
      const notification = await transaction.get(notificationRef);
      const existing = notification.exists ? notification.data()! : undefined;
      const attemptedAt = existing?.emailAttemptedAt ? Date.parse(existing.emailAttemptedAt) : 0;
      const sendingIsStale = !attemptedAt || Date.now() - attemptedAt > 5 * 60 * 1000;
      shouldSendEmail = existing?.emailStatus !== 'sent' && (existing?.emailStatus !== 'sending' || sendingIsStale);
      transaction.set(notificationRef, {
        userId: input.userId,
        audience: input.audience,
        stage: input.stage,
        title,
        message,
        gracePeriodEnd: input.gracePeriodEnd,
        createdAt: existing?.createdAt || now,
        read: existing?.read === true,
        ...(shouldSendEmail ? { emailStatus: 'sending', emailAttemptedAt: now } : {}),
      }, { merge: true });
    });

    if (!shouldSendEmail) return;
    const emailConfig = { apiKey: process.env.RESEND_API_KEY?.trim(), from: process.env.MEMBERSHIP_EMAIL_FROM?.trim() };
    if (!emailConfig.apiKey || !emailConfig.from) {
      await notificationRef.set({ emailStatus: 'not_configured', emailUpdatedAt: new Date().toISOString() }, { merge: true });
      console.warn('Membership reminder email skipped: RESEND_API_KEY and MEMBERSHIP_EMAIL_FROM must be configured');
      return;
    }

    try {
      const user = await db.collection('users').doc(input.userId).get();
      const email = typeof user.data()?.email === 'string' ? user.data()!.email.trim() : '';
      if (!email) throw new Error('Member account has no email address');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${emailConfig.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: emailConfig.from,
          to: [email],
          subject: title,
          text: `${message}\n\nSign in to MedMap to review your membership and payment details.`,
          html: `<p>${message}</p><p>Sign in to MedMap to review your membership and payment details.</p>`,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
      const result = await response.json() as { id?: string };
      await notificationRef.set({ emailStatus: 'sent', emailId: result.id || null, emailUpdatedAt: new Date().toISOString() }, { merge: true });
    } catch (error: any) {
      await notificationRef.set({ emailStatus: 'failed', emailError: String(error?.message || 'Email delivery failed').slice(0, 300), emailUpdatedAt: new Date().toISOString() }, { merge: true });
      console.error('Membership renewal reminder email failed:', error);
    }
  }
}
