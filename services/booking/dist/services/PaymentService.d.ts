import { PaymentIntent, PaymentIntentResult } from '../types';
export declare class PaymentService {
    /**
     * Generate PayFast payment form data with signature
     * Returns the form HTML and the signed data payload
     */
    static createPaymentIntent(intent: PaymentIntent): Promise<PaymentIntentResult & {
        formHtml?: string;
    }>;
    /**
     * Build HTML form that auto-submits to PayFast
     */
    private static buildFormHtml;
    /**
     * Generate PayFast MD5 signature
     * PayFast uses MD5 hash of URL-encoded params + passphrase [citation:6]
     */
    private static generateSignature;
    /**
     * Handle PayFast ITN (webhook)
     * This is where payment confirmation happens
     */
    static handleITN(payload: Record<string, string>): Promise<{
        success: boolean;
        error: string | null;
    }>;
    /**
     * Server-side confirmation: post ITN data back to PayFast
     * This is PayFast's documented security step [citation:3]
     */
    private static serverConfirm;
    /**
     * Verify ITN signature only (without server confirmation)
     */
    static verifyITNSignature(payload: Record<string, string>): boolean;
    /**
     * Get payment by booking ID
     */
    static getPaymentByBookingId(bookingId: string): Promise<any | null>;
    /**
     * Get payment by ID
     */
    static getPayment(paymentId: string): Promise<any | null>;
}
//# sourceMappingURL=PaymentService.d.ts.map