import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import { hasPaidMembershipAccess, membershipGraceWindow, southAfricanRunDate } from './membershipAccess';
import { MembershipReminderService } from './MembershipReminderService';
import { PayFastSubscriptionService } from './PayFastSubscriptionService';
import {
  InvalidPayFastNotification,
  PayFastConfiguration,
  configuration,
  verifyPayFastNotification,
} from './PaymentService';
import { payFastSignature } from './payfastSignature';

export const DOCTOR_MEMBERSHIP_PLANS = {
  member: { id: 'member', name: 'Member', amount: 199, frequency: 3, frequencyLabel: 'monthly', badge: 'Member badge' },
  partner: { id: 'partner', name: 'Partner', amount: 699, frequency: 3, frequencyLabel: 'monthly', badge: 'Partner badge' },
} as const;

export type DoctorPlanId = keyof typeof DOCTOR_MEMBERSHIP_PLANS;

type DoctorMembership = {
  userId: string;
  audience: 'doctor';
  planId: DoctorPlanId;
  status: 'active' | 'past_due' | 'expired' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  payfastToken: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
  lastPaymentAt?: string;
  lastPaymentStatus?: string;
  gracePeriodStart?: string;
  gracePeriodEnd?: string;
  pendingPlanId?: DoctorPlanId;
  pendingPlanEffectiveAt?: string;
  oldPayfastTokenToCancel?: string | null;
};

function addMonth(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear() + Math.floor(month / 12);
  const targetMonth = month % 12;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year,
    targetMonth,
    Math.min(date.getUTCDate(), lastDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  )).toISOString();
}

function isCurrent(data: Record<string, any> | undefined, now = Date.now()): data is DoctorMembership {
  return !!data && data.audience === 'doctor' &&
    Object.prototype.hasOwnProperty.call(DOCTOR_MEMBERSHIP_PLANS, data.planId) &&
    hasPaidMembershipAccess(data, now);
}

function publicMembership(data?: Record<string, any>): Record<string, unknown> {
  const current = isCurrent(data);
  const planId = current ? data.planId : 'free';
  const plan = planId === 'free' ? null : DOCTOR_MEMBERSHIP_PLANS[planId as DoctorPlanId];
  const hasPaidHistory = !!data && Object.prototype.hasOwnProperty.call(DOCTOR_MEMBERSHIP_PLANS, data.planId);
  return {
    planId,
    status: current ? data.status : hasPaidHistory ? 'expired' : 'active',
    currentPeriodStart: current ? data.currentPeriodStart : null,
    currentPeriodEnd: current ? data.currentPeriodEnd : null,
    gracePeriodEnd: current && data.status === 'past_due' ? data.gracePeriodEnd || null : null,
    pendingPlanId: current ? data.pendingPlanId || null : null,
    pendingPlanEffectiveAt: current ? data.pendingPlanEffectiveAt || null : null,
    cancelAtPeriodEnd: current && data.cancelAtPeriodEnd === true,
    canCancel: current && !!data.payfastToken && data.cancelAtPeriodEnd !== true,
    amount: plan?.amount ?? 0,
    frequencyLabel: plan?.frequencyLabel ?? null,
    paymentStatus: current ? (data.lastPaymentStatus || 'paid') : null,
  };
}

function payFastCheckout(fields: Record<string, string>, config: PayFastConfiguration) {
  fields.signature = payFastSignature(fields, config.passphrase);
  return { mode: config.mode, action: config.processUrl, fields };
}

function ensureLiveRecurringConfig(): PayFastConfiguration {
  if (process.env.PAYFAST_MODE?.trim().toLowerCase() !== 'live') {
    throw new Error('Doctor memberships are available only with live PayFast payments enabled');
  }
  const config = configuration('live');
  if (!config.passphrase) throw new Error('A PayFast passphrase is required for recurring memberships');
  return config;
}

function publicFields(planId: DoctorPlanId, status: string, periodEnd: string, gracePeriodEnd?: string) {
  return {
    membershipPlanId: planId,
    membershipStatus: status,
    membershipPeriodEnd: periodEnd,
    membershipGracePeriodEnd: gracePeriodEnd || null,
    membershipBadge: DOCTOR_MEMBERSHIP_PLANS[planId].badge,
    membershipFeatured: planId === 'partner',
    membershipUpdatedAt: new Date().toISOString(),
  };
}

export class DoctorMembershipService {
  static async getMembership(userId: string) {
    const snapshot = await db.collection('doctorMemberships').doc(userId).get();
    const notifications = await MembershipReminderService.listForUser(userId);
    return { ...publicMembership(snapshot.exists ? snapshot.data() : undefined), notifications };
  }

  static async hasSubscriptionToken(token: string): Promise<boolean> {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(token)) return false;
    const snapshot = await db.collection('doctorMembershipSubscriptions').doc(token).get();
    return snapshot.exists;
  }

  static async createCheckout(userId: string, requestedPlanId: unknown) {
    if (typeof requestedPlanId !== 'string' || !Object.prototype.hasOwnProperty.call(DOCTOR_MEMBERSHIP_PLANS, requestedPlanId)) {
      throw new Error('Choose a valid provider membership plan');
    }
    const planId = requestedPlanId as DoctorPlanId;
    const plan = DOCTOR_MEMBERSHIP_PLANS[planId];
    const config = ensureLiveRecurringConfig();
    const userRef = db.collection('users').doc(userId);
    const doctorRef = db.collection('doctors').doc(userId);
    const membershipRef = db.collection('doctorMemberships').doc(userId);
    const [userSnap, doctorSnap] = await Promise.all([userRef.get(), doctorRef.get()]);
    if (!userSnap.exists || userSnap.data()?.role !== 'doctor' || !doctorSnap.exists) {
      throw new Error('A provider account with a practice profile is required to purchase this membership');
    }
    const user = userSnap.data()!;
    const email = typeof user.email === 'string' ? user.email : '';
    if (!email) throw new Error('A valid account email is required for PayFast recurring billing');

    const reference = `pfd_${crypto.randomUUID()}`;
    const paymentRef = db.collection('doctorMembershipPayments').doc(reference);
    const now = new Date().toISOString();
    await db.runTransaction(async transaction => {
      const membershipSnap = await transaction.get(membershipRef);
      const existing = membershipSnap.exists ? membershipSnap.data() : undefined;
      if (isCurrent(existing)) {
        const currentPlan = DOCTOR_MEMBERSHIP_PLANS[existing.planId as DoctorPlanId];
        if (plan.amount <= currentPlan.amount) {
          throw new Error('Choose a higher tier to upgrade. Use the downgrade option to change to a lower tier at renewal.');
        }
      }
      if (existing?.pendingCheckoutId) {
        const pendingRef = db.collection('doctorMembershipPayments').doc(existing.pendingCheckoutId);
        const pendingSnap = await transaction.get(pendingRef);
        const pending = pendingSnap.exists ? pendingSnap.data() : undefined;
        const pendingAge = pending?.createdAt ? Date.now() - Date.parse(pending.createdAt) : Infinity;
        if (pending?.status === 'pending' && pendingAge < 30 * 60 * 1000) {
          throw new Error('A membership payment is already in progress. Please finish or wait 30 minutes before retrying.');
        }
      }
      transaction.set(paymentRef, {
        reference,
        userId,
        audience: 'doctor',
        planId,
        amount: plan.amount,
        changeType: isCurrent(existing) ? 'upgrade' : existing?.payfastToken ? 'replacement' : 'new',
        previousPlanId: existing?.planId || null,
        previousPayfastToken: existing?.payfastToken || null,
        currency: 'ZAR',
        provider: 'payfast',
        environment: 'live',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      transaction.set(membershipRef, { userId, audience: 'doctor', pendingCheckoutId: reference, updatedAt: now }, { merge: true });
    });

    const name = String(user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Provider').trim();
    const [firstName, ...lastName] = name.split(/\s+/);
    const fields: Record<string, string> = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: new URL('/memberships?payment=success&audience=doctor', config.clientUrl).toString(),
      cancel_url: new URL('/memberships?payment=cancelled&audience=doctor', config.clientUrl).toString(),
      notify_url: new URL('/api/payments/payfast/notify', config.publicUrl).toString(),
      name_first: firstName.slice(0, 100),
      name_last: lastName.join(' ').slice(0, 100),
      email_address: email.slice(0, 100),
      m_payment_id: reference,
      amount: plan.amount.toFixed(2),
      item_name: `MedMap ${plan.name}`,
      item_description: `${plan.name} provider membership, billed monthly`,
      subscription_type: '1',
      frequency: String(plan.frequency),
      cycles: '0',
      recurring_amount: plan.amount.toFixed(2),
      payment_method: 'cc',
      subscription_notify_email: 'true',
      subscription_notify_webhook: 'true',
      subscription_notify_buyer: 'true',
    };
    return { reference, planId, amount: plan.amount, checkout: payFastCheckout(fields, config) };
  }

  static async cancelRenewal(userId: string) {
    const config = ensureLiveRecurringConfig();
    const membershipRef = db.collection('doctorMemberships').doc(userId);
    const membershipSnap = await membershipRef.get();
    if (!membershipSnap.exists) throw new Error('No active provider membership was found');
    const membership = membershipSnap.data()!;
    if (!isCurrent(membership)) throw new Error('This provider membership is no longer active');
    if (membership.cancelAtPeriodEnd === true) return publicMembership(membership);
    if (!membership.payfastToken) throw new Error('PayFast subscription details are unavailable');
    await PayFastSubscriptionService.cancel(membership.payfastToken, config);
    const now = new Date().toISOString();
    await membershipRef.update({
      cancelAtPeriodEnd: true,
      autoRenew: false,
      pendingPlanId: FieldValue.delete(),
      pendingPlanEffectiveAt: FieldValue.delete(),
      updatedAt: now,
    });
    await db.collection('doctorMembershipSubscriptions').doc(membership.payfastToken).set({
      status: 'cancelled', pendingPlanId: FieldValue.delete(), pendingAmount: FieldValue.delete(),
      pendingRunDate: FieldValue.delete(), cancelledAt: now, updatedAt: now,
    }, { merge: true });
    return this.getMembership(userId);
  }

  static async scheduleDowngrade(userId: string, requestedPlanId: unknown) {
    if (typeof requestedPlanId !== 'string' || !Object.prototype.hasOwnProperty.call(DOCTOR_MEMBERSHIP_PLANS, requestedPlanId)) {
      throw new Error('Choose a valid provider membership plan');
    }
    const planId = requestedPlanId as DoctorPlanId;
    const config = ensureLiveRecurringConfig();
    const membershipRef = db.collection('doctorMemberships').doc(userId);
    const snapshot = await membershipRef.get();
    const membership = snapshot.data();
    if (!snapshot.exists || !isCurrent(membership)) throw new Error('An active provider membership is required to schedule a downgrade');
    if (membership.cancelAtPeriodEnd === true) throw new Error('Renewal is already canceled; reactivate the membership before scheduling a downgrade');
    if (!membership.payfastToken) throw new Error('PayFast subscription details are unavailable');
    if (DOCTOR_MEMBERSHIP_PLANS[planId].amount >= DOCTOR_MEMBERSHIP_PLANS[membership.planId].amount) {
      throw new Error('Choose a lower tier to schedule a downgrade');
    }
    const runDate = southAfricanRunDate(membership.currentPeriodEnd);
    await PayFastSubscriptionService.update(membership.payfastToken, config, DOCTOR_MEMBERSHIP_PLANS[planId].amount * 100, runDate);
    const now = new Date().toISOString();
    await db.runTransaction(async transaction => {
      const latest = await transaction.get(membershipRef);
      if (!latest.exists || !isCurrent(latest.data())) throw new Error('Membership changed while scheduling the downgrade');
      if (latest.data()?.payfastToken !== membership.payfastToken) throw new Error('PayFast subscription changed; reload and try again');
      transaction.update(membershipRef, { pendingPlanId: planId, pendingPlanEffectiveAt: membership.currentPeriodEnd, updatedAt: now });
      transaction.set(db.collection('doctorMembershipSubscriptions').doc(membership.payfastToken), {
        pendingPlanId: planId,
        pendingAmount: DOCTOR_MEMBERSHIP_PLANS[planId].amount,
        pendingRunDate: runDate,
        updatedAt: now,
      }, { merge: true });
    });
    return this.getMembership(userId);
  }

  static async handleITN(payload: Record<string, unknown>, sourceIp: string): Promise<void> {
    const { fields, matchedConfig } = await verifyPayFastNotification(payload, sourceIp);
    if (matchedConfig.mode !== 'live') throw new InvalidPayFastNotification('Provider memberships accept live PayFast notifications only');
    const token = fields.token || '';
    if (token && !/^[A-Za-z0-9_-]{1,100}$/.test(token)) throw new InvalidPayFastNotification('Invalid recurring PayFast token');
    if (fields.m_payment_id && !/^[A-Za-z0-9_-]{1,100}$/.test(fields.m_payment_id)) {
      throw new InvalidPayFastNotification('Invalid provider membership payment reference');
    }
    const paymentStatus = fields.payment_status;
    if (!['COMPLETE', 'FAILED', 'CANCELLED', 'PENDING'].includes(paymentStatus)) {
      throw new InvalidPayFastNotification('Unknown PayFast provider membership status');
    }
    const paymentRef = fields.m_payment_id?.startsWith('pfd_')
      ? db.collection('doctorMembershipPayments').doc(fields.m_payment_id)
      : null;
    if (paymentStatus === 'COMPLETE' && !token) throw new InvalidPayFastNotification('Missing recurring PayFast token');
    if (!token) {
      if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
        if (!paymentRef) throw new InvalidPayFastNotification('Missing provider membership payment reference');
        const initialPayment = await paymentRef.get();
        if (!initialPayment.exists || initialPayment.data()?.environment !== 'live' || initialPayment.data()?.audience !== 'doctor') {
          throw new InvalidPayFastNotification('Unknown PayFast provider membership reference');
        }
        await paymentRef.set({ status: paymentStatus.toLowerCase(), updatedAt: new Date().toISOString() }, { merge: true });
      }
      return;
    }

    const subscriptionRef = db.collection('doctorMembershipSubscriptions').doc(token);
    const eventId = fields.pf_payment_id && /^[A-Za-z0-9_-]{1,100}$/.test(fields.pf_payment_id) ? fields.pf_payment_id : '';
    const transactionRef = eventId ? db.collection('doctorMembershipTransactions').doc(eventId) : null;
    const now = new Date().toISOString();
    if (paymentStatus === 'PENDING') return;
    if (paymentStatus === 'COMPLETE') {
      const amountGross = Number(fields.amount_gross);
      if (!eventId || !Number.isFinite(amountGross) || amountGross <= 0) {
        throw new InvalidPayFastNotification('Missing PayFast provider membership transaction details');
      }
    }

    let oldTokenToCancel = '';
    let upgradeUserId = '';
    let failedRenewalReminder: { userId: string; periodEnd: string; gracePeriodEnd: string } | null = null;
    await db.runTransaction(async transaction => {
      const [subscriptionSnap, paymentSnap, eventSnap] = await Promise.all([
        transaction.get(subscriptionRef),
        paymentRef ? transaction.get(paymentRef) : Promise.resolve(null),
        transactionRef ? transaction.get(transactionRef) : Promise.resolve(null),
      ]);
      if (eventSnap?.exists) return;

      if (paymentStatus === 'COMPLETE') {
        const amountGross = Number(fields.amount_gross);
        let userId: string;
        let planId: DoctorPlanId;
        let isInitialCharge = false;
        let changeType = 'renewal';
        let previousPayfastToken = '';
        let previousPlanId: DoctorPlanId | '' = '';
        if (subscriptionSnap.exists) {
          const subscription = subscriptionSnap.data()!;
          userId = subscription.userId;
          planId = (subscription.pendingPlanId || subscription.planId) as DoctorPlanId;
        } else {
          if (!paymentSnap?.exists) throw new InvalidPayFastNotification('Unknown PayFast provider membership reference');
          const payment = paymentSnap.data()!;
          if (payment.provider !== 'payfast' || payment.environment !== 'live' ||
              payment.reference !== fields.m_payment_id || payment.audience !== 'doctor') {
            throw new InvalidPayFastNotification('Provider membership payment record mismatch');
          }
          userId = payment.userId;
          planId = payment.planId as DoctorPlanId;
          changeType = payment.changeType || 'new';
          previousPayfastToken = payment.previousPayfastToken || '';
          previousPlanId = payment.previousPlanId || '';
          isInitialCharge = true;
        }
        const plan = DOCTOR_MEMBERSHIP_PLANS[planId];
        if (!plan || plan.amount !== amountGross || (isInitialCharge && paymentSnap?.data()?.amount !== amountGross)) {
          throw new InvalidPayFastNotification('PayFast provider membership amount mismatch');
        }
        const membershipRef = db.collection('doctorMemberships').doc(userId);
        const membershipSnap = await transaction.get(membershipRef);
        const existingMembership = membershipSnap.exists ? membershipSnap.data() : undefined;
        const isUpgrade = isInitialCharge && changeType === 'upgrade';
        const isReplacement = isInitialCharge && changeType === 'replacement';
        const isPlanTransition = isUpgrade || isReplacement;
        if (isInitialCharge && isCurrent(existingMembership) && !isPlanTransition) {
          throw new InvalidPayFastNotification('A provider membership is already active for this account');
        }
        if (isUpgrade && (!existingMembership || existingMembership.planId !== previousPlanId ||
            DOCTOR_MEMBERSHIP_PLANS[planId].amount <= DOCTOR_MEMBERSHIP_PLANS[existingMembership.planId as DoctorPlanId].amount ||
            existingMembership.payfastToken !== previousPayfastToken)) {
          throw new InvalidPayFastNotification('Provider membership upgrade no longer matches the active plan');
        }
        if (isReplacement && (!existingMembership || existingMembership.planId !== previousPlanId ||
            existingMembership.payfastToken !== previousPayfastToken)) {
          throw new InvalidPayFastNotification('Provider membership replacement no longer matches the previous subscription');
        }
        const previousEnd = existingMembership?.currentPeriodEnd;
        const periodStart = !isPlanTransition && !isInitialCharge && existingMembership?.status !== 'expired' && previousEnd && Number.isFinite(Date.parse(previousEnd)) ? previousEnd : now;
        const periodEnd = addMonth(periodStart);
        const membership: DoctorMembership = {
          userId,
          audience: 'doctor',
          planId,
          status: 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          payfastToken: token,
          cancelAtPeriodEnd: isInitialCharge ? false : existingMembership?.cancelAtPeriodEnd === true,
          autoRenew: isInitialCharge ? true : existingMembership?.autoRenew !== false,
          createdAt: existingMembership?.createdAt || now,
          updatedAt: now,
          lastPaymentAt: now,
          lastPaymentStatus: 'paid',
          ...(isPlanTransition && previousPayfastToken && previousPayfastToken !== token
            ? { oldPayfastTokenToCancel: previousPayfastToken }
            : {}),
        };
        transaction.set(membershipRef, {
          ...membership,
          ...(isInitialCharge ? { pendingCheckoutId: null } : {}),
          gracePeriodStart: FieldValue.delete(),
          gracePeriodEnd: FieldValue.delete(),
          pendingPlanId: FieldValue.delete(),
          pendingPlanEffectiveAt: FieldValue.delete(),
        }, { merge: true });
        transaction.set(subscriptionRef, {
          token,
          userId,
          planId,
          amount: plan.amount,
          currency: 'ZAR',
          environment: 'live',
          status: subscriptionSnap.exists ? subscriptionSnap.data()?.status || 'active' : 'active',
          createdAt: subscriptionSnap.exists ? subscriptionSnap.data()?.createdAt || now : now,
          lastPaymentAt: now,
          updatedAt: now,
          pendingPlanId: FieldValue.delete(),
          pendingAmount: FieldValue.delete(),
          pendingRunDate: FieldValue.delete(),
        }, { merge: true });
        if (isPlanTransition && previousPayfastToken && previousPayfastToken !== token) {
          oldTokenToCancel = previousPayfastToken;
          upgradeUserId = userId;
        }
        transaction.set(db.collection('doctors').doc(userId), publicFields(planId, 'active', periodEnd), { merge: true });
        if (isInitialCharge && paymentSnap?.exists && paymentRef) {
          transaction.set(paymentRef, { status: 'paid', pfPaymentId: fields.pf_payment_id, token, updatedAt: now }, { merge: true });
        }
        if (transactionRef) {
          transaction.create(transactionRef, {
            pfPaymentId: fields.pf_payment_id,
            mPaymentId: fields.m_payment_id || null,
            token: fields.token,
            userId,
            planId,
            amount: amountGross,
            currency: 'ZAR',
            status: 'paid',
            receivedAt: now,
          });
        }
        return;
      }

      if (!subscriptionSnap.exists) {
        if ((paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') && paymentSnap?.exists && paymentRef) {
          transaction.set(paymentRef, { status: paymentStatus.toLowerCase(), updatedAt: now }, { merge: true });
          return;
        }
        throw new InvalidPayFastNotification('Unknown PayFast provider membership subscription');
      }
      const subscription = subscriptionSnap.data()!;
      const membershipRef = db.collection('doctorMemberships').doc(subscription.userId);
      const membershipSnap = await transaction.get(membershipRef);
      if (!membershipSnap.exists || membershipSnap.data()?.payfastToken !== fields.token) {
        throw new InvalidPayFastNotification('Provider membership subscription does not match the account');
      }
      const membership = membershipSnap.data()!;
      if (paymentStatus === 'CANCELLED') {
        transaction.set(subscriptionRef, { status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true });
        transaction.update(membershipRef, { cancelAtPeriodEnd: true, autoRenew: false, updatedAt: now });
        return;
      }
      if (paymentStatus === 'FAILED') {
        const grace = membershipGraceWindow(membership);
        const gracePeriodStart = membership.gracePeriodStart || grace.start;
        const gracePeriodEnd = membership.gracePeriodEnd || grace.end;
        transaction.set(subscriptionRef, { lastPaymentStatus: 'failed', updatedAt: now }, { merge: true });
        transaction.update(membershipRef, {
          status: 'past_due', lastPaymentStatus: 'failed',
          gracePeriodStart, gracePeriodEnd, lastFailedPaymentAt: membership.lastFailedPaymentAt || now,
          updatedAt: now,
        });
        transaction.set(db.collection('doctors').doc(subscription.userId), {
          membershipStatus: 'past_due', membershipGracePeriodEnd: gracePeriodEnd, membershipUpdatedAt: now,
        }, { merge: true });
        failedRenewalReminder = { userId: subscription.userId, periodEnd: membership.currentPeriodEnd, gracePeriodEnd };
        if (transactionRef) {
          transaction.create(transactionRef, {
            pfPaymentId: fields.pf_payment_id,
            mPaymentId: fields.m_payment_id || null,
            token: fields.token,
            userId: subscription.userId,
            planId: subscription.planId,
            amount: Number(fields.amount_gross) || 0,
            status: 'failed',
            receivedAt: now,
          });
        }
      }
    });
    const reminder = failedRenewalReminder as { userId: string; periodEnd: string; gracePeriodEnd: string } | null;
    if (reminder) {
      await MembershipReminderService.sendRenewalReminder({ ...reminder, audience: 'doctor', stage: 'payment_failed' });
    }
    if (!oldTokenToCancel && paymentStatus === 'COMPLETE') {
      const subscription = await subscriptionRef.get();
      upgradeUserId = subscription.data()?.userId || '';
      const currentMembership = upgradeUserId ? await db.collection('doctorMemberships').doc(upgradeUserId).get() : null;
      oldTokenToCancel = currentMembership?.data()?.oldPayfastTokenToCancel || '';
    }
    if (oldTokenToCancel) {
      try {
        await PayFastSubscriptionService.cancel(oldTokenToCancel, matchedConfig);
        const completedAt = new Date().toISOString();
        await db.collection('doctorMembershipSubscriptions').doc(oldTokenToCancel).set({ status: 'cancelled', cancelledAt: completedAt, updatedAt: completedAt }, { merge: true });
        if (upgradeUserId) await db.collection('doctorMemberships').doc(upgradeUserId).update({ oldPayfastTokenToCancel: FieldValue.delete(), updatedAt: completedAt });
      } catch (error) {
        console.error('Could not cancel the replaced provider subscription; background cleanup will retry:', error);
      }
    }
  }
}
