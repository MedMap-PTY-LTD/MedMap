export declare const PATIENT_MEMBERSHIP_PLANS: {
    readonly basic_premium: {
        readonly id: "basic_premium";
        readonly name: "Basic Premium";
        readonly amount: 39;
        readonly frequency: 4;
        readonly frequencyLabel: "quarterly";
        readonly freeCompletedBookings: 5;
    };
    readonly premium_plus: {
        readonly id: "premium_plus";
        readonly name: "Premium Plus";
        readonly amount: 99;
        readonly frequency: 4;
        readonly frequencyLabel: "quarterly";
        readonly freeCompletedBookings: null;
    };
};
export type PatientPlanId = keyof typeof PATIENT_MEMBERSHIP_PLANS;
export declare class PatientMembershipService {
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
    static getBookingEntitlement(userId: string): Promise<{
        planId: "free";
        bookingFee: number;
        freeBookingsRemaining: number;
        freeBookingEligible: boolean;
        periodStart: null;
    } | {
        planId: "premium_plus";
        bookingFee: number;
        freeBookingsRemaining: number;
        freeBookingEligible: boolean;
        periodStart: string;
    } | {
        planId: "basic_premium";
        bookingFee: number;
        freeBookingsRemaining: number;
        freeBookingEligible: boolean;
        periodStart: string;
    }>;
    static createCheckout(userId: string, requestedPlanId: unknown): Promise<{
        reference: string;
        planId: "basic_premium" | "premium_plus";
        amount: 39 | 99;
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
//# sourceMappingURL=PatientMembershipService.d.ts.map