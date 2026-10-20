import { db } from '../config/firebase';

export type AccountCreditKind = 'admin_refund' | 'admin_compensation' | 'booking_fee_debit' | 'booking_fee_return';

export interface AccountCreditTransaction {
  id: string;
  userId: string;
  amountCents: number;
  balanceAfterCents: number;
  kind: AccountCreditKind;
  reason: string;
  source: string;
  bookingId?: string;
  adminUid?: string;
  adminEmail?: string;
  createdAt: string;
}

export function accountCreditRef(userId: string) {
  return db.collection('accountCredits').doc(userId);
}

export function accountCreditTransactionRef(userId: string, id: string) {
  return accountCreditRef(userId).collection('transactions').doc(id);
}

export class AccountCreditService {
  static async getSummary(userId: string): Promise<{ balanceCents: number; currency: 'ZAR'; transactions: AccountCreditTransaction[] }> {
    const accountRef = accountCreditRef(userId);
    const [account, transactions] = await Promise.all([
      accountRef.get(),
      accountRef.collection('transactions').orderBy('createdAt', 'desc').limit(50).get(),
    ]);
    return {
      balanceCents: Math.max(0, Math.floor(Number(account.data()?.balanceCents) || 0)),
      currency: 'ZAR',
      transactions: transactions.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountCreditTransaction)),
    };
  }

  static async issueAdminCredit(input: {
    userId: string;
    amountCents: number;
    kind: 'admin_refund' | 'admin_compensation';
    reason: string;
    source?: string;
    adminUid: string;
    adminEmail: string;
  }): Promise<{ balanceCents: number; transactionId: string }> {
    const accountRef = accountCreditRef(input.userId);
    const ledgerRef = accountRef.collection('transactions').doc();
    const now = new Date().toISOString();

    const balanceCents = await db.runTransaction(async transaction => {
      const account = await transaction.get(accountRef);
      const currentBalance = Math.max(0, Math.floor(Number(account.data()?.balanceCents) || 0));
      const nextBalance = currentBalance + input.amountCents;
      if (!Number.isSafeInteger(nextBalance)) throw new Error('Account credit balance exceeds the supported limit');
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

  static async issueBookingRefundCredit(input: {
    queueId: string;
    reason: string;
    adminUid: string;
    adminEmail: string;
  }): Promise<{
    balanceCents: number;
    transactionId: string;
    alreadyProcessed?: boolean;
    bookingId?: string;
    patientId?: string;
    doctorId?: string;
    bookingCancelled?: boolean;
  }> {
    const queueRef = db.collection('refundQueue').doc(input.queueId);
    return db.runTransaction(async transaction => {
      const queueSnap = await transaction.get(queueRef);
      if (!queueSnap.exists) throw new Error('Refund review not found');
      const queue = queueSnap.data()!;
      const bookingId = typeof queue.bookingId === 'string' ? queue.bookingId : '';
      const bookingRef = bookingId ? db.collection('bookings').doc(bookingId) : null;
      const bookingSnap = bookingRef ? await transaction.get(bookingRef) : null;
      const booking = bookingSnap?.exists ? bookingSnap.data() : undefined;
      const userId = String(queue.patientId || booking?.patientId || '');
      if (!userId) throw new Error('Refund review has no patient account');
      const isCancellationRefund = queue.reviewType === 'booking_cancellation' || booking?.paymentStatus === 'refund_pending';
      const canCancelBooking = !!booking && ['pending', 'unconfirmed', 'live', 'confirmed', 'rescheduled'].includes(String(booking.status));
      const now = new Date().toISOString();

      if (queue.status === 'credited_to_account') {
        const account = await transaction.get(accountCreditRef(userId));
        if (bookingRef && booking) {
          const bookingUpdate: Record<string, any> = {
            refundCreditStatus: 'credited',
            refundCreditAmountCents: Math.max(0, Math.floor(Number(queue.creditAmountCents) || 0)),
            refundCreditAt: queue.processedAt || now,
            updatedAt: now,
          };
          if (isCancellationRefund) bookingUpdate.paymentStatus = 'credited';
          if (isCancellationRefund && canCancelBooking) {
            bookingUpdate.status = 'cancelled';
            bookingUpdate.cancelledAt = booking.cancelledAt || now;
            bookingUpdate.cancellationReason = booking.cancellationReason || queue.reason || 'Cancelled with refund';
          }
          transaction.update(bookingRef, bookingUpdate);
          if (isCancellationRefund && booking.paymentId) {
            transaction.set(db.collection('payments').doc(booking.paymentId), { status: 'credited', updatedAt: now }, { merge: true });
          }
        }
        return {
          balanceCents: Math.max(0, Math.floor(Number(account.data()?.balanceCents) || 0)),
          transactionId: String(queue.creditTransactionId || ''),
          alreadyProcessed: true,
          ...(bookingId ? { bookingId } : {}),
          ...(booking ? { patientId: String(booking.patientId || userId), doctorId: String(booking.doctorId || '') } : { patientId: userId }),
          bookingCancelled: isCancellationRefund && (!!booking && (canCancelBooking || booking.status === 'cancelled')),
        };
      }
      if (!['pending_account_credit_review', 'pending_manual_refund'].includes(String(queue.status))) {
        throw new Error('This refund review has already been resolved');
      }

      const amountCents = Math.max(0, Math.floor(Number(queue.amountCents) || Math.round(Number(queue.amount || 0) * 100)));
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Refund review amount is invalid');

      const accountRef = accountCreditRef(userId);
      const ledgerId = `refund_${input.queueId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
      const ledgerRef = accountCreditTransactionRef(userId, ledgerId);
      const [accountSnap, ledgerSnap] = await Promise.all([
        transaction.get(accountRef),
        transaction.get(ledgerRef),
      ]);
      if (ledgerSnap.exists) throw new Error('Account credit was already issued for this refund review');
      const currentBalance = Math.max(0, Math.floor(Number(accountSnap.data()?.balanceCents) || 0));
      const balanceCents = currentBalance + amountCents;
      if (!Number.isSafeInteger(balanceCents)) throw new Error('Account credit balance exceeds the supported limit');
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
        const bookingUpdate: Record<string, any> = {
          refundCreditStatus: 'credited',
          refundCreditAmountCents: amountCents,
          refundCreditAt: now,
          refundCreditAdminUid: input.adminUid,
          updatedAt: now,
        };
        if (isCancellationRefund) bookingUpdate.paymentStatus = 'credited';
        if (isCancellationRefund && canCancelBooking) {
          bookingUpdate.status = 'cancelled';
          bookingUpdate.cancelledAt = booking?.cancelledAt || now;
          bookingUpdate.cancellationReason = booking?.cancellationReason || queue.reason || 'Cancelled with refund';
        }
        transaction.update(bookingRef, bookingUpdate);
        if (isCancellationRefund && booking?.paymentId) {
          transaction.set(db.collection('payments').doc(booking.paymentId), { status: 'credited', updatedAt: now }, { merge: true });
        }
      }
      return {
        balanceCents,
        transactionId: ledgerId,
        ...(bookingId ? { bookingId } : {}),
        ...(booking ? { patientId: String(booking.patientId || userId), doctorId: String(booking.doctorId || '') } : { patientId: userId }),
        bookingCancelled: isCancellationRefund && (!!booking && (canCancelBooking || booking.status === 'cancelled')),
      };
    });
  }

  static async declineBookingRefundReview(input: {
    queueId: string;
    reason: string;
    adminUid: string;
    adminEmail: string;
  }): Promise<void> {
    const queueRef = db.collection('refundQueue').doc(input.queueId);
    const now = new Date().toISOString();
    await db.runTransaction(async transaction => {
      const queueSnap = await transaction.get(queueRef);
      if (!queueSnap.exists) throw new Error('Refund review not found');
      if (!['pending_account_credit_review', 'pending_manual_refund'].includes(String(queueSnap.data()?.status))) {
        throw new Error('This refund review has already been resolved');
      }
      const bookingId = queueSnap.data()?.bookingId;
      const bookingRef = typeof bookingId === 'string' && bookingId ? db.collection('bookings').doc(bookingId) : null;
      const bookingSnap = bookingRef ? await transaction.get(bookingRef) : null;
      transaction.update(queueRef, {
        status: 'declined',
        resolutionReason: input.reason,
        resolvedBy: input.adminUid,
        resolvedByEmail: input.adminEmail,
        processedAt: now,
      });
      if (bookingRef && bookingSnap?.exists) {
        const update: Record<string, any> = { refundCreditStatus: 'declined', updatedAt: now };
        if (bookingSnap.data()?.paymentStatus === 'refund_pending') {
          update.paymentStatus = 'paid';
          const paymentId = bookingSnap.data()?.paymentId;
          if (paymentId) transaction.set(db.collection('payments').doc(paymentId), { status: 'paid', updatedAt: now }, { merge: true });
        }
        transaction.update(bookingRef, update);
      }
    });
  }
}
