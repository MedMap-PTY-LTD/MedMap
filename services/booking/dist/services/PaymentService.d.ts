/// <reference types="node" />
export declare const BOOKING_FEE = 10;
export type PayFastMode = 'sandbox' | 'live';
export interface PayFastCheckout {
    mode: PayFastMode;
    action: string;
    fields: Record<string, string>;
}
export interface PayFastConfiguration {
    mode: PayFastMode;
    merchantId: string;
    merchantKey: string;
    passphrase?: string;
    processUrl: string;
    validateUrl: string;
    clientUrl: URL;
    publicUrl: URL;
}
export declare class InvalidPayFastNotification extends Error {
}
export declare function configuration(mode?: PayFastMode): PayFastConfiguration;
export declare function notificationConfigurations(active: PayFastConfiguration): PayFastConfiguration[];
export declare function verifyPayFastNotification(payload: Record<string, unknown>, sourceIp: string): Promise<{
    fields: Record<string, string>;
    matchedConfig: PayFastConfiguration;
}>;
export declare class PaymentService {
    static currentMode(): PayFastMode;
    static ensureConfigured(): void;
    static publicConfig(): {
        mode: PayFastMode;
        bookingFee: number;
        currency: "ZAR";
    };
    static publicStatus(): {
        mode: PayFastMode;
        integration: string;
        processOrigin: string;
        validationOrigin: string;
        returnOrigin: string;
        notificationOrigin: string;
    };
    static createPaymentIntent(bookingId: string): Promise<PayFastCheckout>;
    static handleITN(payload: Record<string, unknown>, sourceIp: string): Promise<void>;
}
//# sourceMappingURL=PaymentService.d.ts.map