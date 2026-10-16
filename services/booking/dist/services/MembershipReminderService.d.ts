export type MembershipAudience = 'patient' | 'doctor';
export type MembershipReminderStage = 'payment_failed' | 'grace_midpoint' | 'grace_final';
export declare class MembershipReminderService {
    static listForUser(userId: string): Promise<{
        id: string;
        title: any;
        message: any;
        createdAt: any;
        read: boolean;
        stage: any;
    }[]>;
    static sendRenewalReminder(input: {
        userId: string;
        audience: MembershipAudience;
        periodEnd: string;
        gracePeriodEnd: string;
        stage: MembershipReminderStage;
    }): Promise<void>;
}
//# sourceMappingURL=MembershipReminderService.d.ts.map