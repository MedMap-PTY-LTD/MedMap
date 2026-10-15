import crypto from 'crypto';
import { lookup } from 'dns/promises';
import { db } from '../config/firebase';
import { Booking } from '../types';
import { payFastSignature } from './payfastSignature';

export const BOOKING_FEE = 10;
const PROCESS_URL = 'https://sandbox.payfast.co.za/eng/process';
const VALIDATE_URL = 'https://sandbox.payfast.co.za/eng/query/validate';

export interface PayFastCheckout {
  action: string;
  fields: Record<string, string>;
}

export class InvalidPayFastNotification extends Error {}

function configuration() {
  // This deployment is deliberately sandbox-only. These are PayFast's public
  // test credentials, never live merchant secrets from an existing environment.
  if (process.env.PAYFAST_SANDBOX && process.env.PAYFAST_SANDBOX !== 'true') {
    throw new Error('This deployment only supports PayFast sandbox mode');
  }
  const merchantId = '10004002';
  const merchantKey = 'q1cd2rdny4a53';
  const passphrase = 'payfast';
  const clientBase = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'https://medmap.co.za';
  const publicBase = process.env.PUBLIC_BASE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (!publicBase) throw new Error('PayFast public sandbox callback URL is not configured');
  const clientUrl = new URL(clientBase);
  const publicUrl = new URL(publicBase);
  if (publicUrl.protocol !== 'https:' || !['https:', 'http:'].includes(clientUrl.protocol)) {
    throw new Error('PayFast callback URLs must use a public HTTPS service URL');
  }
  return { merchantId, merchantKey, passphrase, clientUrl, publicUrl };
}

async function verifySource(sourceIp: string): Promise<void> {
  const hosts = ['sandbox.payfast.co.za', 'www.payfast.co.za', 'w1.payfast.co.za', 'w2.payfast.co.za'];
  const lookups = await Promise.allSettled(hosts.map(host => lookup(host, { all: true })));
  const addresses = new Set(lookups.flatMap(result =>
    result.status === 'fulfilled' ? result.value.map(address => address.address) : []
  ));
  if (addresses.size === 0) throw new Error('Could not resolve PayFast notification addresses');
  if (!addresses.has(sourceIp.replace(/^::ffff:/, ''))) {
    throw new InvalidPayFastNotification('Unexpected PayFast notification source');
  }
}

function checkoutFor(booking: Booking, reference: string): PayFastCheckout {
  const { merchantId, merchantKey, passphrase, clientUrl, publicUrl } = configuration();
  const returnUrl = new URL('/payfast/success', clientUrl);
  const cancelUrl = new URL('/payfast/cancel', clientUrl);
  returnUrl.searchParams.set('bookingId', booking.id);
  cancelUrl.searchParams.set('bookingId', booking.id);
  // A sandbox gateway needs no real patient contact details.
  const fields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: returnUrl.toString(),
    cancel_url: cancelUrl.toString(),
    notify_url: new URL('/api/payments/payfast/notify', publicUrl).toString(),
    name_first: 'MedMap',
    name_last: 'Sandbox',
    email_address: 'sandbox@example.com',
    m_payment_id: reference,
    amount: BOOKING_FEE.toFixed(2),
    item_name: 'MedMap Booking Fee',
    item_description: `Booking ${booking.id}`,
  };
  fields.signature = payFastSignature(fields, passphrase);
  return { action: PROCESS_URL, fields };
}

export class PaymentService {
  static ensureSandboxConfigured(): void {
    configuration();
  }

  static async createPaymentIntent(bookingId: string): Promise<PayFastCheckout> {
    configuration();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const result = await db.runTransaction(async transaction => {
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) throw new Error('Booking not found');
      const booking = { ...bookingSnap.data(), id: bookingId } as Booking;
      if (!booking.isTestBooking || booking.paymentEnvironment !== 'sandbox') {
        throw new Error('Only sandbox test bookings can be paid in this deployment');
      }
      if (booking.status !== 'pending' || ['paid', 'refund_pending', 'refunded'].includes(booking.paymentStatus)) {
        throw new Error('This booking cannot be paid');
      }

      if (booking.paymentId) {
        const existing = await transaction.get(db.collection('payments').doc(booking.paymentId));
        if (existing.exists && existing.data()?.status === 'pending' &&
            existing.data()?.environment === 'sandbox' && existing.data()?.amount === BOOKING_FEE && existing.data()?.reference === booking.paymentId) {
          return { booking, reference: booking.paymentId };
        }
      }

      const reference = `pf_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      transaction.set(db.collection('payments').doc(reference), {
        paymentId: reference, bookingId, reference, amount: BOOKING_FEE,
        currency: 'ZAR', provider: 'payfast', environment: 'sandbox', status: 'pending',
        createdAt: now, updatedAt: now,
      });
      transaction.update(bookingRef, {
        bookingFee: BOOKING_FEE, paymentEnvironment: 'sandbox', isTestBooking: true, paymentId: reference, paymentReference: reference,
        paymentStatus: 'pending', updatedAt: now,
      });
      return { booking, reference };
    });
    return checkoutFor(result.booking, result.reference);
  }

  static async handleITN(payload: Record<string, unknown>, sourceIp: string): Promise<void> {
    const { merchantId, passphrase } = configuration();
    if (!payload || Object.values(payload).some(value => typeof value !== 'string')) {
      throw new InvalidPayFastNotification('Malformed PayFast notification');
    }
    const fields = payload as Record<string, string>;
    const received = fields.signature || '';
    const expected = payFastSignature(fields, passphrase, true);
    if (!/^[a-f0-9]{32}$/i.test(received) ||
        !crypto.timingSafeEqual(Buffer.from(received.toLowerCase()), Buffer.from(expected))) {
      throw new InvalidPayFastNotification('Invalid PayFast signature');
    }
    if (fields.merchant_id !== merchantId || !fields.m_payment_id ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(fields.pf_payment_id || '') ||
        !Number.isFinite(Number(fields.amount_gross)) || Number(fields.amount_gross) !== BOOKING_FEE) {
      throw new InvalidPayFastNotification('PayFast merchant, reference, or amount mismatch');
    }
    await verifySource(sourceIp);

    const confirmation = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
      signal: AbortSignal.timeout(10000),
    });
    if (!confirmation.ok) throw new Error(`PayFast validation unavailable (${confirmation.status})`);
    if ((await confirmation.text()).trim() !== 'VALID') {
      throw new InvalidPayFastNotification('PayFast rejected the notification');
    }

    const paymentRef = db.collection('payments').doc(fields.m_payment_id);
    await db.runTransaction(async transaction => {
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists) throw new InvalidPayFastNotification('Unknown payment reference');
      const payment = paymentSnap.data()!;
      if (payment.provider !== 'payfast' || payment.environment !== 'sandbox' || payment.reference !== fields.m_payment_id ||
          payment.amount !== BOOKING_FEE || !payment.bookingId) {
        throw new InvalidPayFastNotification('Payment record mismatch');
      }
      const bookingRef = db.collection('bookings').doc(payment.bookingId);
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) throw new InvalidPayFastNotification('Booking not found');
      const booking = bookingSnap.data() as Booking;
      if ((payment.status === 'paid' || payment.status === 'refund_pending') &&
          payment.pfPaymentId === fields.pf_payment_id) return;
      const now = new Date().toISOString();
      if (payment.pfPaymentId && payment.pfPaymentId !== fields.pf_payment_id &&
          (payment.status === 'paid' || payment.status === 'refund_pending')) {
        if (fields.payment_status === 'COMPLETE') {
          transaction.set(db.collection('refundQueue').doc(`duplicate_${fields.pf_payment_id}`), {
            bookingId: payment.bookingId, paymentId: paymentRef.id,
            pfPaymentId: fields.pf_payment_id, amount: BOOKING_FEE,
            customerEmail: booking.patientEmail, customerName: booking.patientName,
            reason: 'Duplicate PayFast charge for one payment reference',
            environment: 'sandbox', status: 'pending_manual_refund', createdAt: now,
          }, { merge: true });
        }
        return;
      }
      if (fields.payment_status === 'COMPLETE') {
        if (booking.status === 'pending' && booking.paymentId === paymentRef.id && booking.paymentStatus !== 'paid') {
          transaction.update(paymentRef, { status: 'paid', pfPaymentId: fields.pf_payment_id, updatedAt: now });
          transaction.update(bookingRef, {
            paymentStatus: 'paid', pfPaymentId: fields.pf_payment_id,
            paidAt: now, status: 'confirmed', confirmedAt: now, updatedAt: now,
          });
        } else {
          // Late payments need a manual refund; a cancelled slot must never be revived.
          transaction.set(db.collection('refundQueue').doc(paymentRef.id), {
            bookingId: payment.bookingId, paymentId: paymentRef.id,
            pfPaymentId: fields.pf_payment_id, amount: BOOKING_FEE,
            customerEmail: booking.patientEmail, customerName: booking.patientName,
            reason: 'Payment arrived after booking was cancelled or replaced',
            environment: 'sandbox', status: 'pending_manual_refund', createdAt: now,
          }, { merge: true });
          transaction.update(paymentRef, { status: 'refund_pending', pfPaymentId: fields.pf_payment_id, updatedAt: now });
          if (booking.status === 'cancelled' && booking.paymentId === paymentRef.id) {
            transaction.update(bookingRef, { paymentStatus: 'refund_pending', updatedAt: now });
          }
        }
      } else if (fields.payment_status === 'FAILED' || fields.payment_status === 'CANCELLED') {
        if (payment.status === 'paid') return;
        transaction.update(paymentRef, { status: 'failed', pfPaymentId: fields.pf_payment_id, updatedAt: now });
        if (booking.status === 'pending' && booking.paymentId === paymentRef.id) {
          transaction.update(bookingRef, { paymentStatus: 'failed', updatedAt: now });
        }
      } else if (fields.payment_status !== 'PENDING') {
        throw new InvalidPayFastNotification('Unknown payment status');
      }
    });
  }
}
