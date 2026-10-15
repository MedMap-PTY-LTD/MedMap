// src/services/PaymentService.ts
import { db } from '../config/firebase';
import crypto from 'crypto';
import { PaymentIntent, PaymentIntentResult, RefundResult, PaymentStatus } from '../types';

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '';
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '';
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX === 'true';

// PayFast endpoints
const PAYFAST_HOST = PAYFAST_SANDBOX 
  ? 'sandbox.payfast.co.za' 
  : 'www.payfast.co.za';
const PAYFAST_PROCESS_URL = `https://${PAYFAST_HOST}/eng/process`;
const PAYFAST_VALIDATE_URL = `https://${PAYFAST_HOST}/eng/query/validate`;

const RETURN_URL = process.env.PAYFAST_RETURN_URL || 'https://yourapp.com/payment/success';
const CANCEL_URL = process.env.PAYFAST_CANCEL_URL || 'https://yourapp.com/payment/cancel';
const NOTIFY_URL = process.env.PAYFAST_NOTIFY_URL || 'https://yourapi.com/api/payments/payfast/notify';

export class PaymentService {
  /**
   * Generate PayFast payment form data with signature
   * Returns the form HTML and the signed data payload
   */
  static async createPaymentIntent(intent: PaymentIntent): Promise<PaymentIntentResult & { formHtml?: string }> {
    try {
      // Build the payment data payload for PayFast
      const paymentData: Record<string, string> = {
        // Merchant details
        merchant_id: PAYFAST_MERCHANT_ID,
        merchant_key: PAYFAST_MERCHANT_KEY,
        return_url: `${RETURN_URL}?bookingId=${intent.bookingId}`,
        cancel_url: `${CANCEL_URL}?bookingId=${intent.bookingId}`,
        notify_url: NOTIFY_URL,

        // Customer details (optional but recommended)
        name_first: intent.customerName.split(' ')[0] || '',
        name_last: intent.customerName.split(' ').slice(1).join(' ') || '',
        email_address: intent.customerEmail,

        // Transaction details
        m_payment_id: intent.bookingId, // Your unique reference
        amount: intent.amount.toFixed(2), // PayFast expects "100.00" format
        item_name: intent.description || 'Consultation Booking',
        item_description: `Booking ${intent.bookingId}`,
      };

      // Generate signature
      const signature = this.generateSignature(paymentData, PAYFAST_PASSPHRASE);
      paymentData.signature = signature;

      // Build HTML form for redirect
      const formHtml = this.buildFormHtml(paymentData);

      // Save payment record to Firestore
      const paymentId = `pf_${intent.bookingId}_${Date.now()}`;
      await db.collection('payments').doc(paymentId).set({
        paymentId,
        bookingId: intent.bookingId,
        amount: intent.amount,
        currency: 'ZAR',
        status: 'pending',
        provider: 'payfast',
        customerEmail: intent.customerEmail,
        customerName: intent.customerName,
        reference: intent.bookingId,
        paymentData, // Store signed data for reference
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update booking
      await db.collection('bookings').doc(intent.bookingId).update({
        paymentId,
        paymentReference: intent.bookingId,
        paymentStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });

      return {
        paymentId,
        paymentUrl: PAYFAST_PROCESS_URL, // PayFast's hosted page
        formHtml,
        status: 'pending',
        error: null,
      };
    } catch (error: any) {
      console.error('PayFast createPaymentIntent error:', error);
      return {
        paymentId: '',
        paymentUrl: '',
        status: 'failed',
        error: error.message || 'Payment initialization failed',
      };
    }
  }

  /**
   * Build HTML form that auto-submits to PayFast
   */
  private static buildFormHtml(data: Record<string, string>): string {
    let inputs = '';
    for (const [key, value] of Object.entries(data)) {
      inputs += `<input type="hidden" name="${key}" value="${value}" />`;
    }

    return `
      <form id="payfast-form" action="${PAYFAST_PROCESS_URL}" method="post">
        ${inputs}
      </form>
      <script>document.getElementById('payfast-form').submit();</script>
    `;
  }

  /**
   * Generate PayFast MD5 signature
   * PayFast uses MD5 hash of URL-encoded params + passphrase [citation:6]
   */
  private static generateSignature(data: Record<string, string>, passphrase: string): string {
    // Exclude signature field itself
    const filtered = Object.entries(data)
      .filter(([key]) => key !== 'signature')
      .map(([key, value]) => `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, '+')}`)
      .join('&');

    const signatureString = passphrase 
      ? `${filtered}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
      : filtered;

    return crypto.createHash('md5').update(signatureString).digest('hex');
  }

  /**
   * Handle PayFast ITN (webhook)
   * This is where payment confirmation happens
   */
  static async handleITN(payload: Record<string, string>): Promise<{ success: boolean; error: string | null }> {
    try {
      // Step 1: Verify signature
      const receivedSignature = payload.signature;
      const calculatedSignature = this.generateSignature(payload, PAYFAST_PASSPHRASE);
      
      if (receivedSignature !== calculatedSignature) {
        console.error('ITN signature mismatch');
        return { success: false, error: 'Invalid signature' };
      }

      // Step 2: Server confirmation — post back to PayFast [citation:3]
      const confirmation = await this.serverConfirm(payload);
      if (!confirmation) {
        return { success: false, error: 'Server confirmation failed' };
      }

      const mPaymentId = payload.m_payment_id; // Your bookingId
      const pfPaymentId = payload.pf_payment_id; // PayFast transaction ID
      const paymentStatus = payload.payment_status; // COMPLETE or CANCELLED
      const amountGross = parseFloat(payload.amount_gross);

      // Step 3: Update payment record
      const paymentSnapshot = await db.collection('payments')
        .where('reference', '==', mPaymentId)
        .limit(1)
        .get();

      if (!paymentSnapshot.empty) {
        await paymentSnapshot.docs[0].ref.update({
          status: paymentStatus === 'COMPLETE' ? 'paid' : 'cancelled',
          pfPaymentId,
          amountGross,
          amountFee: parseFloat(payload.amount_fee || '0'),
          amountNet: parseFloat(payload.amount_net || '0'),
          itnPayload: payload,
          updatedAt: new Date().toISOString(),
        });
      }

      // Step 4: Update booking
      const { BookingService } = await import('./BookingService');

      if (paymentStatus === 'COMPLETE') {
        await BookingService.markBookingAsPaid(
          mPaymentId,
          pfPaymentId,
          mPaymentId
        );
      } else if (paymentStatus === 'CANCELLED') {
        await BookingService.markBookingPaymentFailed(
          mPaymentId,
          'Payment cancelled'
        );
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('ITN handling error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Server-side confirmation: post ITN data back to PayFast
   * This is PayFast's documented security step [citation:3]
   */
  private static async serverConfirm(payload: Record<string, string>): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(payload)) {
        params.append(key, value);
      }

      const response = await fetch(PAYFAST_VALIDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const text = await response.text();
      return text.trim() === 'VALID';
    } catch (error) {
      console.error('PayFast server confirm error:', error);
      return false;
    }
  }

  /**
   * Verify ITN signature only (without server confirmation)
   */
  static verifyITNSignature(payload: Record<string, string>): boolean {
    const receivedSignature = payload.signature;
    const calculatedSignature = this.generateSignature(payload, PAYFAST_PASSPHRASE);
    return receivedSignature === calculatedSignature;
  }

  /**
   * Get payment by booking ID
   */
  static async getPaymentByBookingId(bookingId: string): Promise<any | null> {
    try {
      const snapshot = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Error getting payment:', error);
      return null;
    }
  }

  /**
   * Get payment by ID
   */
  static async getPayment(paymentId: string): Promise<any | null> {
    try {
      const doc = await db.collection('payments').doc(paymentId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting payment:', error);
      return null;
    }
  }
}