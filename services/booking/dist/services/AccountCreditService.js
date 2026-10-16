"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCreditService = exports.accountCreditTransactionRef = exports.accountCreditRef = void 0;
const firebase_1 = require("../config/firebase");
function accountCreditRef(userId) {
    return firebase_1.db.collection('accountCredits').doc(userId);
}
exports.accountCreditRef = accountCreditRef;
function accountCreditTransactionRef(userId, id) {
    return accountCreditRef(userId).collection('transactions').doc(id);
}
exports.accountCreditTransactionRef = accountCreditTransactionRef;
class AccountCreditService {
    static async getSummary(userId) {
        const accountRef = accountCreditRef(userId);
        const [account, transactions] = await Promise.all([
            accountRef.get(),
            accountRef.collection('transactions').orderBy('createdAt', 'desc').limit(50).get(),
        ]);
        return {
            balanceCents: Math.max(0, Math.floor(Number(account.data()?.balanceCents) || 0)),
            currency: 'ZAR',
            transactions: transactions.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        };
    }
    static async issueAdminCredit(input) {
        const accountRef = accountCreditRef(input.userId);
        const ledgerRef = accountRef.collection('transactions').doc();
        const now = new Date().toISOString();
        const balanceCents = await firebase_1.db.runTransaction(async (transaction) => {
            const account = await transaction.get(accountRef);
            const currentBalance = Math.max(0, Math.floor(Number(account.data()?.balanceCents) || 0));
            const nextBalance = currentBalance + input.amountCents;
            if (!Number.isSafeInteger(nextBalance))
                throw new Error('Account credit balance exceeds the supported limit');
            transaction.set(accountRef, {
                userId: input.userId,
                currency: 'ZAR',
                balanceCents: nextBalance,
                updatedAt: now,
            }, { merge: true });
            transaction.create(ledgerRef, {
                userId: input.userId,
                amountCents: input.amountCents,
                balanceAfterCents: nextBalance,
                kind: input.kind,
                reason: input.reason,
                source: input.source || 'Admin issued account credit',
                adminUid: input.adminUid,
                adminEmail: input.adminEmail,
                createdAt: now,
            });
            return nextBalance;
        });
        return { balanceCents, transactionId: ledgerRef.id };
    }
    static async issueBookingRefundCredit(input) {
        const queueRef = firebase_1.db.collection('refundQueue').doc(input.queueId);
        return firebase_1.db.runTransaction(async (transaction) => {
            const queueSnap = await transaction.get(queueRef);
            if (!queueSnap.exists)
                throw new Error('Refund review not found');
            const queue = queueSnap.data();
            if (queue.status === 'credited_to_account') {
                const userId = String(queue.patientId || '');
                if (!userId)
                    throw new Error('Refund review has no patient account');
                const account = await transaction.get(accountCreditRef(userId));
                return {
                    balanceCents: Math.max(0, Math.floor(Number(account.data()?.balanceCents) || 0)),
                    transactionId: String(queue.creditTransactionId || ''),
                    alreadyProcessed: true,
                };
            }
            if (!['pending_account_credit_review', 'pending_manual_refund'].includes(String(queue.status))) {
                throw new Error('This refund review has already been resolved');
            }
            const bookingId = typeof queue.bookingId === 'string' ? queue.bookingId : '';
            const bookingRef = bookingId ? firebase_1.db.collection('bookings').doc(bookingId) : null;
            const bookingSnap = bookingRef ? await transaction.get(bookingRef) : null;
            const userId = String(queue.patientId || bookingSnap?.data()?.patientId || '');
            if (!userId)
                throw new Error('Refund review has no patient account');
            const amountCents = Math.max(0, Math.floor(Number(queue.amountCents) || Math.round(Number(queue.amount || 0) * 100)));
            if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
                throw new Error('Refund review amount is invalid');
            const accountRef = accountCreditRef(userId);
            const ledgerId = `refund_${input.queueId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
            const ledgerRef = accountCreditTransactionRef(userId, ledgerId);
            const [accountSnap, ledgerSnap] = await Promise.all([
                transaction.get(accountRef),
                transaction.get(ledgerRef),
            ]);
            if (ledgerSnap.exists)
                throw new Error('Account credit was already issued for this refund review');
            const currentBalance = Math.max(0, Math.floor(Number(accountSnap.data()?.balanceCents) || 0));
            const balanceCents = currentBalance + amountCents;
            if (!Number.isSafeInteger(balanceCents))
                throw new Error('Account credit balance exceeds the supported limit');
            const now = new Date().toISOString();
            transaction.set(accountRef, { userId, currency: 'ZAR', balanceCents, updatedAt: now }, { merge: true });
            transaction.create(ledgerRef, {
                userId,
                amountCents,
                balanceAfterCents: balanceCents,
                kind: 'admin_refund',
                reason: input.reason,
                source: `Booking refund review ${bookingId || input.queueId}`,
                ...(bookingId ? { bookingId } : {}),
                adminUid: input.adminUid,
                adminEmail: input.adminEmail,
                createdAt: now,
            });
            transaction.update(queueRef, {
                status: 'credited_to_account',
                creditAmountCents: amountCents,
                creditTransactionId: ledgerId,
                resolutionReason: input.reason,
                resolvedBy: input.adminUid,
                resolvedByEmail: input.adminEmail,
                processedAt: now,
            });
            if (bookingRef && bookingSnap?.exists) {
                transaction.update(bookingRef, {
                    refundCreditStatus: 'credited',
                    refundCreditAmountCents: amountCents,
                    refundCreditAt: now,
                    refundCreditAdminUid: input.adminUid,
                    updatedAt: now,
                });
                if (queue.reviewType === 'booking_cancellation' || bookingSnap.data()?.paymentStatus === 'refund_pending') {
                    const paymentId = bookingSnap.data()?.paymentId;
                    transaction.update(bookingRef, { paymentStatus: 'credited' });
                    if (paymentId)
                        transaction.set(firebase_1.db.collection('payments').doc(paymentId), { status: 'credited', updatedAt: now }, { merge: true });
                }
            }
            return { balanceCents, transactionId: ledgerId };
        });
    }
    static async declineBookingRefundReview(input) {
        const queueRef = firebase_1.db.collection('refundQueue').doc(input.queueId);
        const now = new Date().toISOString();
        await firebase_1.db.runTransaction(async (transaction) => {
            const queueSnap = await transaction.get(queueRef);
            if (!queueSnap.exists)
                throw new Error('Refund review not found');
            if (!['pending_account_credit_review', 'pending_manual_refund'].includes(String(queueSnap.data()?.status))) {
                throw new Error('This refund review has already been resolved');
            }
            const bookingId = queueSnap.data()?.bookingId;
            const bookingRef = typeof bookingId === 'string' && bookingId ? firebase_1.db.collection('bookings').doc(bookingId) : null;
            const bookingSnap = bookingRef ? await transaction.get(bookingRef) : null;
            transaction.update(queueRef, {
                status: 'declined',
                resolutionReason: input.reason,
                resolvedBy: input.adminUid,
                resolvedByEmail: input.adminEmail,
                processedAt: now,
            });
            if (bookingRef && bookingSnap?.exists) {
                const update = { refundCreditStatus: 'declined', updatedAt: now };
                if (bookingSnap.data()?.paymentStatus === 'refund_pending') {
                    update.paymentStatus = 'paid';
                    const paymentId = bookingSnap.data()?.paymentId;
                    if (paymentId)
                        transaction.set(firebase_1.db.collection('payments').doc(paymentId), { status: 'paid', updatedAt: now }, { merge: true });
                }
                transaction.update(bookingRef, update);
            }
        });
    }
}
exports.AccountCreditService = AccountCreditService;
//# sourceMappingURL=AccountCreditService.js.map