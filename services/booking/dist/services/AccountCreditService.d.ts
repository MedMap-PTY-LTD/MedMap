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
export declare function accountCreditRef(userId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare function accountCreditTransactionRef(userId: string, id: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
export declare class AccountCreditService {
    static getSummary(userId: string): Promise<{
        balanceCents: number;
        currency: 'ZAR';
        transactions: AccountCreditTransaction[];
    }>;
    static issueAdminCredit(input: {
        userId: string;
        amountCents: number;
        kind: 'admin_refund' | 'admin_compensation';
        reason: string;
        source?: string;
        adminUid: string;
        adminEmail: string;
    }): Promise<{
        balanceCents: number;
        transactionId: string;
    }>;
    static issueBookingRefundCredit(input: {
        queueId: string;
        reason: string;
        adminUid: string;
        adminEmail: string;
    }): Promise<{
        balanceCents: number;
        transactionId: string;
        alreadyProcessed?: boolean;
    }>;
    static declineBookingRefundReview(input: {
        queueId: string;
        reason: string;
        adminUid: string;
        adminEmail: string;
    }): Promise<void>;
}
//# sourceMappingURL=AccountCreditService.d.ts.map