export declare const DOCTOR_MEMBERSHIP_PLANS: {
    readonly member: {
        readonly id: "member";
        readonly name: "Member";
        readonly amount: 199;
        readonly frequency: 3;
        readonly frequencyLabel: "monthly";
        readonly badge: "Member badge";
    };
    readonly partner: {
        readonly id: "partner";
        readonly name: "Partner";
        readonly amount: 699;
        readonly frequency: 3;
        readonly frequencyLabel: "monthly";
        readonly badge: "Partner badge";
    };
};
export type DoctorPlanId = keyof typeof DOCTOR_MEMBERSHIP_PLANS;
export declare class DoctorMembershipService {
    static getMembership(userId: string): Promise<{
        notifications: {
            id: string;
            title: any;
            message: any;
            createdAt: any;
            read: boolean;
            stage: any;
        }[];
    }>;
    static hasSubscriptionToken(token: string): Promise<boolean>;
    static createCheckout(userId: string, requestedPlanId: unknown): Promise<{
        reference: string;
        planId: "member" | "partner";
        amount: 199 | 699;
        checkout: {
            mode: import("./PaymentService").PayFastMode;
            action: string;
            fields: Record<string, string>;
        };
    }>;
    static cancelRenewal(userId: string): Promise<Record<string, unknown> | {
        notifications: {
            id: string;
            title: any;
            message: any;
            createdAt: any;
            read: boolean;
            stage: any;
        }[];
    }>;
    static scheduleDowngrade(userId: string, requestedPlanId: unknown): Promise<{
        notifications: {
            id: string;
            title: any;
            message: any;
            createdAt: any;
            read: boolean;
            stage: any;
        }[];
    }>;
    static handleITN(payload: Record<string, unknown>, sourceIp: string): Promise<void>;
}
//# sourceMappingURL=DoctorMembershipService.d.ts.map