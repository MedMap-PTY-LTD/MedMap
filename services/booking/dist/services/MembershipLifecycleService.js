"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipLifecycleService = void 0;
const firebase_1 = require("../config/firebase");
const PaymentService_1 = require("./PaymentService");
const MembershipReminderService_1 = require("./MembershipReminderService");
const PayFastSubscriptionService_1 = require("./PayFastSubscriptionService");
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDER_MIDPOINT_MS = 3 * 24 * 60 * 60 * 1000;
function graceEndFor(data, now) {
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
class MembershipLifecycleService {
    static start() {
        if (this.running)
            return;
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
    static async processAudience(audience, collectionName) {
        const snapshot = await firebase_1.db.collection(collectionName).where('status', '==', 'past_due').get();
        for (const document of snapshot.docs) {
            const data = document.data();
            const now = Date.now();
            const grace = graceEndFor(data, now);
            const graceEnd = Date.parse(grace.end);
            if (!data.gracePeriodStart || !data.gracePeriodEnd) {
                await document.ref.set({ gracePeriodStart: grace.start, gracePeriodEnd: grace.end, updatedAt: new Date().toISOString() }, { merge: true });
            }
            if (graceEnd <= now) {
                await firebase_1.db.runTransaction(async (transaction) => {
                    const current = await transaction.get(document.ref);
                    if (!current.exists || current.data()?.status !== 'past_due')
                        return;
                    transaction.update(document.ref, { status: 'expired', updatedAt: new Date().toISOString() });
                    if (audience === 'doctor') {
                        transaction.set(firebase_1.db.collection('doctors').doc(document.id), {
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
            await MembershipReminderService_1.MembershipReminderService.sendRenewalReminder({
                userId: document.id,
                audience,
                periodEnd,
                gracePeriodEnd: grace.end,
                stage: 'payment_failed',
            });
            const reminderStages = [];
            if (elapsed >= REMINDER_MIDPOINT_MS)
                reminderStages.push('grace_midpoint');
            if (remaining <= 24 * 60 * 60 * 1000)
                reminderStages.push('grace_final');
            for (const stage of reminderStages) {
                await MembershipReminderService_1.MembershipReminderService.sendRenewalReminder({
                    userId: document.id,
                    audience,
                    periodEnd,
                    gracePeriodEnd: grace.end,
                    stage,
                });
            }
        }
    }
    static async retrySupersededSubscriptions() {
        const config = (() => {
            try {
                return (0, PaymentService_1.configuration)('live');
            }
            catch {
                return null;
            }
        })();
        if (!config?.passphrase)
            return;
        for (const [collectionName, subscriptionsName] of [
            ['patientMemberships', 'patientMembershipSubscriptions'],
            ['doctorMemberships', 'doctorMembershipSubscriptions'],
        ]) {
            const snapshot = await firebase_1.db.collection(collectionName).get();
            for (const document of snapshot.docs) {
                const token = document.data().oldPayfastTokenToCancel;
                if (typeof token !== 'string' || !token)
                    continue;
                try {
                    await PayFastSubscriptionService_1.PayFastSubscriptionService.cancel(token, config);
                    const now = new Date().toISOString();
                    await firebase_1.db.collection(subscriptionsName).doc(token).set({ status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true });
                    await document.ref.update({ oldPayfastTokenToCancel: null, updatedAt: now });
                }
                catch (error) {
                    console.error('Could not cancel the superseded PayFast membership subscription; it will be retried:', error);
                }
            }
        }
    }
}
exports.MembershipLifecycleService = MembershipLifecycleService;
MembershipLifecycleService.running = false;
//# sourceMappingURL=MembershipLifecycleService.js.map