"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientMembershipService = exports.PATIENT_MEMBERSHIP_PLANS = void 0;
const crypto_1 = __importDefault(require("crypto"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../config/firebase");
const membershipAccess_1 = require("./membershipAccess");
const MembershipReminderService_1 = require("./MembershipReminderService");
const PayFastSubscriptionService_1 = require("./PayFastSubscriptionService");
const PaymentService_1 = require("./PaymentService");
const payfastSignature_1 = require("./payfastSignature");
exports.PATIENT_MEMBERSHIP_PLANS = {
    basic_premium: {
        id: 'basic_premium',
        name: 'Basic Premium',
        amount: 39,
        frequency: 4,
        frequencyLabel: 'quarterly',
        freeCompletedBookings: 5,
    },
    premium_plus: {
        id: 'premium_plus',
        name: 'Premium Plus',
        amount: 99,
        frequency: 4,
        frequencyLabel: 'quarterly',
        freeCompletedBookings: null,
    },
};
function addQuarter(dateString) {
    const date = new Date(dateString);
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 3;
    const year = date.getUTCFullYear() + Math.floor(month / 12);
    const targetMonth = month % 12;
    const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
    date.setUTCFullYear(year, targetMonth, Math.min(day, lastDay));
    return date.toISOString();
}
function isCurrent(data, now = Date.now()) {
    return !!data && data.audience === 'patient' &&
        Object.prototype.hasOwnProperty.call(exports.PATIENT_MEMBERSHIP_PLANS, data.planId) &&
        (0, membershipAccess_1.hasPaidMembershipAccess)(data, now);
}
function publicMembership(data) {
    const now = Date.now();
    const current = isCurrent(data, now);
    const planId = current ? data.planId : 'free';
    const plan = planId === 'free' ? null : exports.PATIENT_MEMBERSHIP_PLANS[planId];
    const completedFreeBookings = current && planId === 'basic_premium'
        ? Math.max(0, Number(data.completedFreeBookings) || 0)
        : 0;
    const reservedFreeBookings = current && planId === 'basic_premium'
        ? Math.max(0, Number(data.reservedFreeBookings) || 0)
        : 0;
    return {
        planId,
        status: current ? data.status : data ? 'expired' : 'active',
        currentPeriodStart: current ? data.currentPeriodStart : null,
        currentPeriodEnd: current ? data.currentPeriodEnd : null,
        gracePeriodEnd: current && data.status === 'past_due' ? data.gracePeriodEnd || null : null,
        pendingPlanId: current ? data.pendingPlanId || null : null,
        pendingPlanEffectiveAt: current ? data.pendingPlanEffectiveAt || null : null,
        completedFreeBookings,
        freeBookingsRemaining: plan?.freeCompletedBookings == null
            ? 0
            : Math.max(0, plan.freeCompletedBookings - completedFreeBookings - reservedFreeBookings),
        cancelAtPeriodEnd: current && data.cancelAtPeriodEnd === true,
        canCancel: current && !!data.payfastToken && data.cancelAtPeriodEnd !== true,
        amount: plan?.amount ?? 0,
        frequencyLabel: plan?.frequencyLabel ?? null,
        paymentStatus: current ? (data.lastPaymentStatus || 'paid') : null,
    };
}
function payFastCheckout(fields, config) {
    fields.signature = (0, payfastSignature_1.payFastSignature)(fields, config.passphrase);
    return { mode: config.mode, action: config.processUrl, fields };
}
function ensureLiveRecurringConfig() {
    if (process.env.PAYFAST_MODE?.trim().toLowerCase() !== 'live') {
        throw new Error('Patient memberships are available only with live PayFast payments enabled');
    }
    const config = (0, PaymentService_1.configuration)('live');
    if (!config.passphrase)
        throw new Error('A PayFast passphrase is required for recurring memberships');
    return config;
}
class PatientMembershipService {
    static async getMembership(userId) {
        const snapshot = await firebase_1.db.collection('patientMemberships').doc(userId).get();
        const [notifications] = await Promise.all([MembershipReminderService_1.MembershipReminderService.listForUser(userId)]);
        return { ...publicMembership(snapshot.exists ? snapshot.data() : undefined), notifications };
    }
    static async getBookingEntitlement(userId) {
        const snapshot = await firebase_1.db.collection('patientMemberships').doc(userId).get();
        const data = snapshot.exists ? snapshot.data() : undefined;
        if (!isCurrent(data))
            return { planId: 'free', bookingFee: 10, freeBookingsRemaining: 0, freeBookingEligible: false, periodStart: null };
        if (data.planId === 'premium_plus') {
            return { planId: data.planId, bookingFee: 0, freeBookingsRemaining: 0, freeBookingEligible: false, periodStart: data.currentPeriodStart };
        }
        const plan = exports.PATIENT_MEMBERSHIP_PLANS[data.planId];
        const completed = Math.max(0, Number(data.completedFreeBookings) || 0);
        const reserved = Math.max(0, Number(data.reservedFreeBookings) || 0);
        const remaining = Math.max(0, plan.freeCompletedBookings - completed - reserved);
        if (remaining > 0) {
            return { planId: data.planId, bookingFee: 0, freeBookingsRemaining: remaining, freeBookingEligible: true, periodStart: data.currentPeriodStart };
        }
        return { planId: data.planId, bookingFee: 8, freeBookingsRemaining: 0, freeBookingEligible: false, periodStart: data.currentPeriodStart };
    }
    static async createCheckout(userId, requestedPlanId) {
        if (typeof requestedPlanId !== 'string' || !Object.prototype.hasOwnProperty.call(exports.PATIENT_MEMBERSHIP_PLANS, requestedPlanId)) {
            throw new Error('Choose a valid patient membership plan');
        }
        const planId = requestedPlanId;
        const plan = exports.PATIENT_MEMBERSHIP_PLANS[planId];
        const config = ensureLiveRecurringConfig();
        const userRef = firebase_1.db.collection('users').doc(userId);
        const membershipRef = firebase_1.db.collection('patientMemberships').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists || (userSnap.data()?.role && userSnap.data()?.role !== 'patient')) {
            throw new Error('A patient account is required to purchase this membership');
        }
        const user = userSnap.data();
        const email = typeof user.email === 'string' ? user.email : '';
        if (!email)
            throw new Error('A valid account email is required for PayFast recurring billing');
        const reference = `pfm_${crypto_1.default.randomUUID()}`;
        const paymentRef = firebase_1.db.collection('membershipPayments').doc(reference);
        const now = new Date().toISOString();
        const checkoutReference = await firebase_1.db.runTransaction(async (transaction) => {
            const membershipSnap = await transaction.get(membershipRef);
            const existing = membershipSnap.exists ? membershipSnap.data() : undefined;
            if (isCurrent(existing)) {
                const currentPlan = exports.PATIENT_MEMBERSHIP_PLANS[existing.planId];
                if (plan.amount <= currentPlan.amount) {
                    throw new Error('Choose a higher tier to upgrade. Use the downgrade option to change to a lower tier at renewal.');
                }
            }
            if (existing?.pendingCheckoutId) {
                const pendingRef = firebase_1.db.collection('membershipPayments').doc(existing.pendingCheckoutId);
                const pendingSnap = await transaction.get(pendingRef);
                const pending = pendingSnap.exists ? pendingSnap.data() : undefined;
                const pendingAge = pending?.createdAt ? Date.now() - Date.parse(pending.createdAt) : Infinity;
                if (pending?.status === 'pending' && pendingAge < 30 * 60 * 1000) {
                    // Older checkout records were signed with the wrong recurring-field
                    // order. Let the same plan retry once using the corrected signature.
                    if (Number(pending.checkoutSignatureVersion || 1) < 2 &&
                        pending.userId === userId && pending.audience === 'patient' && pending.planId === planId) {
                        transaction.set(pendingRef, { checkoutSignatureVersion: 2, updatedAt: now }, { merge: true });
                        return existing.pendingCheckoutId;
                    }
                    throw new Error('A membership payment is already in progress. Please finish or wait 30 minutes before retrying.');
                }
            }
            transaction.set(paymentRef, {
                reference,
                userId,
                audience: 'patient',
                planId,
                amount: plan.amount,
                changeType: isCurrent(existing) ? 'upgrade' : existing?.payfastToken ? 'replacement' : 'new',
                previousPlanId: existing?.planId || null,
                previousPayfastToken: existing?.payfastToken || null,
                currency: 'ZAR',
                provider: 'payfast',
                environment: 'live',
                status: 'pending',
                checkoutSignatureVersion: 2,
                createdAt: now,
                updatedAt: now,
            });
            transaction.set(membershipRef, {
                userId,
                audience: 'patient',
                pendingCheckoutId: reference,
                updatedAt: now,
            }, { merge: true });
            return reference;
        });
        const clientUrl = config.clientUrl;
        const returnUrl = new URL('/memberships?payment=success', clientUrl).toString();
        const cancelUrl = new URL('/memberships?payment=cancelled', clientUrl).toString();
        const name = String(user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Patient').trim();
        const [firstName, ...lastName] = name.split(/\s+/);
        const fields = {
            merchant_id: config.merchantId,
            merchant_key: config.merchantKey,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            notify_url: new URL('/api/payments/payfast/notify', config.publicUrl).toString(),
            name_first: firstName.slice(0, 100),
            name_last: lastName.join(' ').slice(0, 100),
            email_address: email.slice(0, 100),
            m_payment_id: checkoutReference,
            amount: plan.amount.toFixed(2),
            item_name: `MedMap ${plan.name}`,
            item_description: `${plan.name} patient membership, billed quarterly`,
            payment_method: 'cc',
            subscription_type: '1',
            recurring_amount: plan.amount.toFixed(2),
            frequency: String(plan.frequency),
            cycles: '0',
            subscription_notify_email: 'true',
            subscription_notify_webhook: 'true',
            subscription_notify_buyer: 'true',
        };
        return { reference: checkoutReference, planId, amount: plan.amount, checkout: payFastCheckout(fields, config) };
    }
    static async cancelRenewal(userId) {
        const config = ensureLiveRecurringConfig();
        const membershipRef = firebase_1.db.collection('patientMemberships').doc(userId);
        const membershipSnap = await membershipRef.get();
        if (!membershipSnap.exists)
            throw new Error('No active patient membership was found');
        const membership = membershipSnap.data();
        if (!isCurrent(membership))
            throw new Error('This patient membership is no longer active');
        if (membership.cancelAtPeriodEnd === true)
            return publicMembership(membership);
        if (!membership.payfastToken)
            throw new Error('PayFast subscription details are unavailable');
        await PayFastSubscriptionService_1.PayFastSubscriptionService.cancel(membership.payfastToken, config);
        const now = new Date().toISOString();
        await membershipRef.update({
            cancelAtPeriodEnd: true,
            autoRenew: false,
            pendingPlanId: firestore_1.FieldValue.delete(),
            pendingPlanEffectiveAt: firestore_1.FieldValue.delete(),
            updatedAt: now,
        });
        await firebase_1.db.collection('patientMembershipSubscriptions').doc(membership.payfastToken).set({
            status: 'cancelled', pendingPlanId: firestore_1.FieldValue.delete(), pendingAmount: firestore_1.FieldValue.delete(),
            pendingRunDate: firestore_1.FieldValue.delete(), cancelledAt: now, updatedAt: now,
        }, { merge: true });
        return this.getMembership(userId);
    }
    static async scheduleDowngrade(userId, requestedPlanId) {
        if (typeof requestedPlanId !== 'string' || !Object.prototype.hasOwnProperty.call(exports.PATIENT_MEMBERSHIP_PLANS, requestedPlanId)) {
            throw new Error('Choose a valid patient membership plan');
        }
        const planId = requestedPlanId;
        const config = ensureLiveRecurringConfig();
        const membershipRef = firebase_1.db.collection('patientMemberships').doc(userId);
        const snapshot = await membershipRef.get();
        const membership = snapshot.data();
        if (!snapshot.exists || !isCurrent(membership))
            throw new Error('An active patient membership is required to schedule a downgrade');
        if (membership.cancelAtPeriodEnd === true)
            throw new Error('Renewal is already canceled; reactivate the membership before scheduling a downgrade');
        if (!membership.payfastToken)
            throw new Error('PayFast subscription details are unavailable');
        if (exports.PATIENT_MEMBERSHIP_PLANS[planId].amount >= exports.PATIENT_MEMBERSHIP_PLANS[membership.planId].amount) {
            throw new Error('Choose a lower tier to schedule a downgrade');
        }
        const runDate = (0, membershipAccess_1.southAfricanRunDate)(membership.currentPeriodEnd);
        await PayFastSubscriptionService_1.PayFastSubscriptionService.update(membership.payfastToken, config, exports.PATIENT_MEMBERSHIP_PLANS[planId].amount * 100, runDate);
        const now = new Date().toISOString();
        await firebase_1.db.runTransaction(async (transaction) => {
            const latest = await transaction.get(membershipRef);
            if (!latest.exists || !isCurrent(latest.data()))
                throw new Error('Membership changed while scheduling the downgrade');
            if (latest.data()?.payfastToken !== membership.payfastToken)
                throw new Error('PayFast subscription changed; reload and try again');
            transaction.update(membershipRef, { pendingPlanId: planId, pendingPlanEffectiveAt: membership.currentPeriodEnd, updatedAt: now });
            transaction.set(firebase_1.db.collection('patientMembershipSubscriptions').doc(membership.payfastToken), {
                pendingPlanId: planId,
                pendingAmount: exports.PATIENT_MEMBERSHIP_PLANS[planId].amount,
                pendingRunDate: runDate,
                updatedAt: now,
            }, { merge: true });
        });
        return this.getMembership(userId);
    }
    static async handleITN(payload, sourceIp) {
        const { fields, matchedConfig } = await (0, PaymentService_1.verifyPayFastNotification)(payload, sourceIp);
        if (matchedConfig.mode !== 'live')
            throw new PaymentService_1.InvalidPayFastNotification('Patient memberships accept live PayFast notifications only');
        const token = fields.token || '';
        if (token && !/^[A-Za-z0-9_-]{1,100}$/.test(token))
            throw new PaymentService_1.InvalidPayFastNotification('Invalid recurring PayFast token');
        if (fields.m_payment_id && !/^[A-Za-z0-9_-]{1,100}$/.test(fields.m_payment_id)) {
            throw new PaymentService_1.InvalidPayFastNotification('Invalid membership payment reference');
        }
        const paymentStatus = fields.payment_status;
        if (!['COMPLETE', 'FAILED', 'CANCELLED', 'PENDING'].includes(paymentStatus)) {
            throw new PaymentService_1.InvalidPayFastNotification('Unknown PayFast membership status');
        }
        const paymentRef = fields.m_payment_id
            ? firebase_1.db.collection('membershipPayments').doc(fields.m_payment_id)
            : null;
        if (paymentStatus === 'COMPLETE' && !token)
            throw new PaymentService_1.InvalidPayFastNotification('Missing recurring PayFast token');
        if (!token) {
            if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
                if (!paymentRef || !fields.m_payment_id?.startsWith('pfm_'))
                    throw new PaymentService_1.InvalidPayFastNotification('Missing membership payment reference');
                const initialPayment = await paymentRef.get();
                if (!initialPayment.exists || initialPayment.data()?.environment !== 'live' || initialPayment.data()?.audience !== 'patient') {
                    throw new PaymentService_1.InvalidPayFastNotification('Unknown PayFast membership reference');
                }
                await paymentRef.set({ status: paymentStatus.toLowerCase(), updatedAt: new Date().toISOString() }, { merge: true });
                return;
            }
            return;
        }
        const subscriptionRef = firebase_1.db.collection('patientMembershipSubscriptions').doc(token);
        const eventId = fields.pf_payment_id && /^[A-Za-z0-9_-]{1,100}$/.test(fields.pf_payment_id)
            ? fields.pf_payment_id
            : '';
        const transactionRef = eventId ? firebase_1.db.collection('membershipTransactions').doc(eventId) : null;
        const now = new Date().toISOString();
        if (paymentStatus === 'PENDING')
            return;
        if (paymentStatus === 'COMPLETE') {
            const amountGross = Number(fields.amount_gross);
            if (!eventId || !Number.isFinite(amountGross) || amountGross <= 0) {
                throw new PaymentService_1.InvalidPayFastNotification('Missing PayFast membership transaction details');
            }
        }
        let oldTokenToCancel = '';
        let upgradeUserId = '';
        let failedRenewalReminder = null;
        await firebase_1.db.runTransaction(async (transaction) => {
            const [subscriptionSnap, paymentSnap, eventSnap] = await Promise.all([
                transaction.get(subscriptionRef),
                paymentRef ? transaction.get(paymentRef) : Promise.resolve(null),
                transactionRef ? transaction.get(transactionRef) : Promise.resolve(null),
            ]);
            if (eventSnap?.exists)
                return;
            if (paymentStatus === 'COMPLETE') {
                const amountGross = Number(fields.amount_gross);
                let userId;
                let planId;
                let isInitialCharge = false;
                let changeType = 'renewal';
                let previousPayfastToken = '';
                let previousPlanId = '';
                if (subscriptionSnap.exists) {
                    const subscription = subscriptionSnap.data();
                    userId = subscription.userId;
                    planId = (subscription.pendingPlanId || subscription.planId);
                }
                else {
                    if (!paymentSnap?.exists)
                        throw new PaymentService_1.InvalidPayFastNotification('Unknown PayFast membership reference');
                    const payment = paymentSnap.data();
                    if (payment.provider !== 'payfast' || payment.environment !== 'live' ||
                        payment.reference !== fields.m_payment_id || payment.audience !== 'patient') {
                        throw new PaymentService_1.InvalidPayFastNotification('Membership payment record mismatch');
                    }
                    userId = payment.userId;
                    planId = payment.planId;
                    changeType = payment.changeType || 'new';
                    previousPayfastToken = payment.previousPayfastToken || '';
                    previousPlanId = payment.previousPlanId || '';
                    isInitialCharge = true;
                }
                const plan = exports.PATIENT_MEMBERSHIP_PLANS[planId];
                if (!plan || plan.amount !== amountGross || (isInitialCharge && paymentSnap?.data()?.amount !== amountGross)) {
                    throw new PaymentService_1.InvalidPayFastNotification('PayFast membership amount mismatch');
                }
                const membershipRef = firebase_1.db.collection('patientMemberships').doc(userId);
                const membershipSnap = await transaction.get(membershipRef);
                const existingMembership = membershipSnap.exists ? membershipSnap.data() : undefined;
                const isUpgrade = isInitialCharge && changeType === 'upgrade';
                const isReplacement = isInitialCharge && changeType === 'replacement';
                const isPlanTransition = isUpgrade || isReplacement;
                if (isInitialCharge && isCurrent(existingMembership) && !isPlanTransition) {
                    throw new PaymentService_1.InvalidPayFastNotification('A patient membership is already active for this account');
                }
                if (isUpgrade && (!existingMembership || existingMembership.planId !== previousPlanId ||
                    exports.PATIENT_MEMBERSHIP_PLANS[planId].amount <= exports.PATIENT_MEMBERSHIP_PLANS[existingMembership.planId].amount ||
                    existingMembership.payfastToken !== previousPayfastToken)) {
                    throw new PaymentService_1.InvalidPayFastNotification('Patient membership upgrade no longer matches the active plan');
                }
                if (isReplacement && (!existingMembership || existingMembership.planId !== previousPlanId ||
                    existingMembership.payfastToken !== previousPayfastToken)) {
                    throw new PaymentService_1.InvalidPayFastNotification('Patient membership replacement no longer matches the previous subscription');
                }
                const previousEnd = existingMembership?.currentPeriodEnd;
                const periodStart = !isPlanTransition && !isInitialCharge && existingMembership?.status !== 'expired' && previousEnd && Number.isFinite(Date.parse(previousEnd))
                    ? previousEnd
                    : now;
                const periodEnd = addQuarter(periodStart);
                const membership = {
                    userId,
                    audience: 'patient',
                    planId,
                    status: 'active',
                    currentPeriodStart: periodStart,
                    currentPeriodEnd: periodEnd,
                    completedFreeBookings: 0,
                    reservedFreeBookings: 0,
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
                    gracePeriodStart: firestore_1.FieldValue.delete(),
                    gracePeriodEnd: firestore_1.FieldValue.delete(),
                    pendingPlanId: firestore_1.FieldValue.delete(),
                    pendingPlanEffectiveAt: firestore_1.FieldValue.delete(),
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
                    pendingPlanId: firestore_1.FieldValue.delete(),
                    pendingAmount: firestore_1.FieldValue.delete(),
                    pendingRunDate: firestore_1.FieldValue.delete(),
                }, { merge: true });
                if (isPlanTransition && previousPayfastToken && previousPayfastToken !== token) {
                    oldTokenToCancel = previousPayfastToken;
                    upgradeUserId = userId;
                }
                if (isInitialCharge && paymentSnap?.exists && paymentRef) {
                    transaction.set(paymentRef, {
                        status: 'paid',
                        pfPaymentId: fields.pf_payment_id,
                        token,
                        updatedAt: now,
                    }, { merge: true });
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
                if (paymentStatus === 'FAILED' && paymentSnap?.exists && paymentRef) {
                    transaction.set(paymentRef, { status: 'failed', updatedAt: now }, { merge: true });
                    return;
                }
                if (paymentStatus === 'CANCELLED' && paymentSnap?.exists && paymentRef) {
                    transaction.set(paymentRef, { status: 'cancelled', updatedAt: now }, { merge: true });
                    return;
                }
                throw new PaymentService_1.InvalidPayFastNotification('Unknown PayFast membership subscription');
            }
            const subscription = subscriptionSnap.data();
            const membershipRef = firebase_1.db.collection('patientMemberships').doc(subscription.userId);
            const membershipSnap = await transaction.get(membershipRef);
            if (!membershipSnap.exists || membershipSnap.data()?.payfastToken !== fields.token) {
                throw new PaymentService_1.InvalidPayFastNotification('Membership subscription does not match the active account');
            }
            const membership = membershipSnap.data();
            if (paymentStatus === 'CANCELLED') {
                transaction.set(subscriptionRef, { status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true });
                transaction.update(membershipRef, { cancelAtPeriodEnd: true, autoRenew: false, updatedAt: now });
                return;
            }
            if (paymentStatus === 'FAILED') {
                const grace = (0, membershipAccess_1.membershipGraceWindow)(membership);
                const gracePeriodStart = membership.gracePeriodStart || grace.start;
                const gracePeriodEnd = membership.gracePeriodEnd || grace.end;
                transaction.set(subscriptionRef, { lastPaymentStatus: 'failed', updatedAt: now }, { merge: true });
                transaction.update(membershipRef, {
                    status: 'past_due', lastPaymentStatus: 'failed',
                    gracePeriodStart, gracePeriodEnd, lastFailedPaymentAt: membership.lastFailedPaymentAt || now,
                    updatedAt: now,
                });
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
        const reminder = failedRenewalReminder;
        if (reminder) {
            await MembershipReminderService_1.MembershipReminderService.sendRenewalReminder({ ...reminder, audience: 'patient', stage: 'payment_failed' });
        }
        if (!oldTokenToCancel && paymentStatus === 'COMPLETE') {
            const subscription = await subscriptionRef.get();
            upgradeUserId = subscription.data()?.userId || '';
            const currentMembership = upgradeUserId ? await firebase_1.db.collection('patientMemberships').doc(upgradeUserId).get() : null;
            oldTokenToCancel = currentMembership?.data()?.oldPayfastTokenToCancel || '';
        }
        if (oldTokenToCancel) {
            try {
                const completedAt = new Date().toISOString();
                const oldSubscriptionRef = firebase_1.db.collection('patientMembershipSubscriptions').doc(oldTokenToCancel);
                const oldSubscription = await oldSubscriptionRef.get();
                if (oldSubscription.data()?.status !== 'cancelled')
                    await PayFastSubscriptionService_1.PayFastSubscriptionService.cancel(oldTokenToCancel, matchedConfig);
                await oldSubscriptionRef.set({ status: 'cancelled', cancelledAt: completedAt, updatedAt: completedAt }, { merge: true });
                if (upgradeUserId)
                    await firebase_1.db.collection('patientMemberships').doc(upgradeUserId).update({ oldPayfastTokenToCancel: firestore_1.FieldValue.delete(), updatedAt: completedAt });
            }
            catch (error) {
                console.error('Could not cancel the replaced patient subscription; background cleanup will retry:', error);
            }
        }
    }
}
exports.PatientMembershipService = PatientMembershipService;
//# sourceMappingURL=PatientMembershipService.js.map