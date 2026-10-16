import crypto from 'crypto';
import { lookup } from 'dns/promises';
import { db } from '../config/firebase';
import { Booking } from '../types';
import { payFastSignature } from './payfastSignature';

export const BOOKING_FEE = 10;
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

export class InvalidPayFastNotification extends Error {}

const SANDBOX_MERCHANT_ID = '10004002';
const SANDBOX_MERCHANT_KEY = 'q1cd2rdny4a53';
const SANDBOX_PASSPHRASE = 'payfast';

function selectedMode(): PayFastMode {
  const configuredMode = process.env.PAYFAST_MODE?.trim().toLowerCase();
  if (configuredMode === 'live') return configuredMode;
  if (configuredMode === 'sandbox') {
    if (process.env.PAYFAST_SANDBOX === 'false') {
      throw new Error('This deployment only supports PayFast sandbox mode');
    }
    if (process.env.PAYFAST_SANDBOX && process.env.PAYFAST_SANDBOX !== 'true') {
      throw new Error('PAYFAST_SANDBOX must be true when PAYFAST_MODE is sandbox');
    }
    return configuredMode;
  }
  if (configuredMode) throw new Error('PAYFAST_MODE must be either sandbox or live');

  // Backward compatibility: the old false value meant “refuse checkout”, not
  // “switch to live”. Live mode always requires an explicit PAYFAST_MODE=live.
  if (process.env.PAYFAST_SANDBOX === 'false') {
    throw new Error('This deployment only supports PayFast sandbox mode');
  }
  if (process.env.PAYFAST_SANDBOX && process.env.PAYFAST_SANDBOX !== 'true') {
    throw new Error('PAYFAST_SANDBOX must be true when PAYFAST_MODE is not set');
  }
  return 'sandbox';
}

export function configuration(mode: PayFastMode = selectedMode()): PayFastConfiguration {
  let merchantId: string;
  let merchantKey: string;
  let passphrase: string | undefined;
  if (mode === 'sandbox') {
    merchantId = SANDBOX_MERCHANT_ID;
    merchantKey = SANDBOX_MERCHANT_KEY;
    passphrase = SANDBOX_PASSPHRASE;
  } else {
    merchantId = process.env.PAYFAST_LIVE_MERCHANT_ID?.trim() || '';
    merchantKey = process.env.PAYFAST_LIVE_MERCHANT_KEY?.trim() || '';
    passphrase = process.env.PAYFAST_LIVE_PASSPHRASE?.trim() || undefined;
    if (!merchantId || !merchantKey) {
      throw new Error('Live PayFast merchant credentials are not configured on the booking service');
    }
    if (merchantId === SANDBOX_MERCHANT_ID || merchantKey === SANDBOX_MERCHANT_KEY || passphrase === SANDBOX_PASSPHRASE) {
      throw new Error('Live PayFast configuration contains sandbox credentials');
    }
  }

  const host = mode === 'sandbox' ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
  const clientBase = process.env.PAYFAST_CLIENT_URL?.trim() || 'https://medmap.co.za';
  const publicBase = process.env.PUBLIC_BASE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (!publicBase) throw new Error('PayFast public callback URL is not configured');
  const clientUrl = new URL(clientBase);
  const publicUrl = new URL(publicBase);
  if (publicUrl.protocol !== 'https:' || !['https:', 'http:'].includes(clientUrl.protocol)) {
    throw new Error('PayFast callback URLs must use a public HTTPS service URL');
  }
  return {
    mode,
    merchantId,
    merchantKey,
    passphrase,
    processUrl: `https://${host}/eng/process`,
    validateUrl: `https://${host}/eng/query/validate`,
    clientUrl,
    publicUrl,
  };
}

async function verifySource(sourceIp: string): Promise<void> {
  const hosts = ['sandbox.payfast.co.za', 'www.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za'];
  const lookups = await Promise.allSettled(hosts.map(host => lookup(host, { all: true })));
  const addresses = new Set(lookups.flatMap(result =>
    result.status === 'fulfilled' ? result.value.map(address => address.address) : []
  ));
  if (addresses.size === 0) throw new Error('Could not resolve PayFast notification addresses');
  if (!addresses.has(sourceIp.replace(/^::ffff:/, ''))) {
    throw new InvalidPayFastNotification('Unexpected PayFast notification source');
  }
}

function checkoutFor(booking: Booking, reference: string, amount: number, config: PayFastConfiguration): PayFastCheckout {
  const returnUrl = new URL('/payfast/success', config.clientUrl);
  const cancelUrl = new URL('/payfast/cancel', config.clientUrl);
  returnUrl.searchParams.set('bookingId', booking.id);
  cancelUrl.searchParams.set('bookingId', booking.id);

  const nameParts = (booking.patientName || '').trim().split(/\s+/).filter(Boolean);
  const fields: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: returnUrl.toString(),
    cancel_url: cancelUrl.toString(),
    notify_url: new URL('/api/payments/payfast/notify', config.publicUrl).toString(),
    name_first: config.mode === 'sandbox' ? 'MedMap' : (nameParts.shift() || 'Patient'),
    name_last: config.mode === 'sandbox' ? 'Sandbox' : nameParts.join(' '),
    email_address: config.mode === 'sandbox' ? 'sandbox@example.com' : (booking.patientEmail || ''),
    m_payment_id: reference,
    amount: amount.toFixed(2),
    item_name: 'MedMap Booking Fee',
    item_description: `Booking ${booking.id}`,
  };
  fields.signature = payFastSignature(fields, config.passphrase);
  return { mode: config.mode, action: config.processUrl, fields };
}

export function notificationConfigurations(active: PayFastConfiguration): PayFastConfiguration[] {
  const otherMode: PayFastMode = active.mode === 'sandbox' ? 'live' : 'sandbox';
  try {
    // Accept delayed notifications for an existing payment after a mode switch,
    // while requiring the exact merchant configuration recorded on that payment.
    return [active, configuration(otherMode)];
  } catch {
    return [active];
  }
}

export async function verifyPayFastNotification(
  payload: Record<string, unknown>,
  sourceIp: string,
): Promise<{ fields: Record<string, string>; matchedConfig: PayFastConfiguration }> {
  const activeConfig = configuration();
  if (!payload || Object.values(payload).some(value => typeof value !== 'string')) {
    throw new InvalidPayFastNotification('Malformed PayFast notification');
  }
  const fields = payload as Record<string, string>;
  const received = fields.signature || '';
  if (!/^[a-f0-9]{32}$/i.test(received)) {
    throw new InvalidPayFastNotification('Invalid PayFast signature');
  }
  const receivedSignature = Buffer.from(received.toLowerCase());
  const matchedConfig = notificationConfigurations(activeConfig).find(candidate => {
    if (fields.merchant_id !== candidate.merchantId) return false;
    const expected = payFastSignature(fields, candidate.passphrase, true);
    return crypto.timingSafeEqual(receivedSignature, Buffer.from(expected));
  });
  if (!matchedConfig) throw new InvalidPayFastNotification('Invalid PayFast signature or merchant');
  await verifySource(sourceIp);

  const confirmation = await fetch(matchedConfig.validateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
    signal: AbortSignal.timeout(10000),
  });
  if (!confirmation.ok) throw new Error(`PayFast validation unavailable (${confirmation.status})`);
  if ((await confirmation.text()).trim() !== 'VALID') {
    throw new InvalidPayFastNotification('PayFast rejected the notification');
  }
  return { fields, matchedConfig };
}

export class PaymentService {
  static currentMode(): PayFastMode {
    return selectedMode();
  }

  static ensureConfigured(): void {
    configuration();
  }

  static publicConfig() {
    const config = configuration();
    return { mode: config.mode, bookingFee: BOOKING_FEE, currency: 'ZAR' as const };
  }

  static publicStatus() {
    const config = configuration();
    return {
      mode: config.mode,
      integration: `payfast-${config.mode}-v3`,
      processOrigin: new URL(config.processUrl).origin,
      validationOrigin: new URL(config.validateUrl).origin,
      returnOrigin: config.clientUrl.origin,
      notificationOrigin: config.publicUrl.origin,
    };
  }

  static async createPaymentIntent(bookingId: string): Promise<PayFastCheckout> {
    const config = configuration();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const result = await db.runTransaction(async transaction => {
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) throw new Error('Booking not found');
      const booking = { ...bookingSnap.data(), id: bookingId } as Booking;
      if (config.mode === 'sandbox' && (!booking.isTestBooking || booking.paymentEnvironment !== 'sandbox')) {
        throw new Error('Only sandbox test bookings can be paid in this deployment');
      }
      if (config.mode === 'live' && (booking.isTestBooking || booking.paymentEnvironment !== 'live')) {
        throw new Error('Only live bookings can be paid in this deployment');
      }
      if (booking.status !== 'pending' || ['paid', 'refund_pending', 'refunded'].includes(booking.paymentStatus)) {
        throw new Error('This booking cannot be paid');
      }
      const amount = Number(booking.bookingFee ?? BOOKING_FEE);
      if (!Number.isFinite(amount) || amount < 5) throw new Error('PayFast checkout requires at least R5.00; apply enough account credit or pay the minimum amount');

      if (booking.paymentId) {
        const existing = await transaction.get(db.collection('payments').doc(booking.paymentId));
        if (existing.exists && existing.data()?.status === 'pending' &&
            existing.data()?.environment === config.mode && existing.data()?.amount === amount &&
            existing.data()?.reference === booking.paymentId) {
          return { booking, reference: booking.paymentId, amount };
        }
      }

      const reference = `pf_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      transaction.set(db.collection('payments').doc(reference), {
        paymentId: reference, bookingId, reference, amount,
        currency: 'ZAR', provider: 'payfast', environment: config.mode, status: 'pending',
        createdAt: now, updatedAt: now,
      });
      transaction.update(bookingRef, {
        bookingFee: amount, paymentEnvironment: config.mode, isTestBooking: config.mode === 'sandbox',
        paymentId: reference, paymentReference: reference, paymentStatus: 'pending', updatedAt: now,
      });
      return { booking, reference, amount };
    });
    return checkoutFor(result.booking, result.reference, result.amount, config);
  }

  static async handleITN(payload: Record<string, unknown>, sourceIp: string): Promise<void> {
    const { fields, matchedConfig } = await verifyPayFastNotification(payload, sourceIp);
    if (!fields.m_payment_id || !/^[A-Za-z0-9_-]{1,100}$/.test(fields.pf_payment_id || '') ||
        !Number.isFinite(Number(fields.amount_gross)) || Number(fields.amount_gross) <= 0 || fields.token) {
      throw new InvalidPayFastNotification('PayFast merchant, reference, or amount mismatch');
    }
    const amountGross = Number(fields.amount_gross);

    const paymentRef = db.collection('payments').doc(fields.m_payment_id);
    await db.runTransaction(async transaction => {
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists) throw new InvalidPayFastNotification('Unknown payment reference');
      const payment = paymentSnap.data()!;
      if (payment.provider !== 'payfast' || payment.environment !== matchedConfig.mode ||
          payment.reference !== fields.m_payment_id || payment.amount !== amountGross || !payment.bookingId) {
        throw new InvalidPayFastNotification('Payment record mismatch');
      }
      const bookingRef = db.collection('bookings').doc(payment.bookingId);
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) throw new InvalidPayFastNotification('Booking not found');
      const booking = bookingSnap.data() as Booking;
      if (booking.paymentEnvironment !== matchedConfig.mode ||
          (matchedConfig.mode === 'sandbox' && !booking.isTestBooking) ||
          (matchedConfig.mode === 'live' && booking.isTestBooking)) {
        throw new InvalidPayFastNotification('Booking payment environment mismatch');
      }
      if ((payment.status === 'paid' || payment.status === 'refund_pending') &&
          payment.pfPaymentId === fields.pf_payment_id) return;
      const now = new Date().toISOString();
      if (payment.pfPaymentId && payment.pfPaymentId !== fields.pf_payment_id &&
          (payment.status === 'paid' || payment.status === 'refund_pending')) {
        if (fields.payment_status === 'COMPLETE') {
          transaction.set(db.collection('refundQueue').doc(`duplicate_${fields.pf_payment_id}`), {
            bookingId: payment.bookingId, paymentId: paymentRef.id,
            pfPaymentId: fields.pf_payment_id, amount: payment.amount,
            customerEmail: booking.patientEmail, customerName: booking.patientName,
            reason: 'Duplicate PayFast charge for one payment reference',
            environment: matchedConfig.mode, status: 'pending_manual_refund', createdAt: now,
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
            pfPaymentId: fields.pf_payment_id, amount: payment.amount,
            customerEmail: booking.patientEmail, customerName: booking.patientName,
            reason: 'Payment arrived after booking was cancelled or replaced',
            environment: matchedConfig.mode, status: 'pending_manual_refund', createdAt: now,
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
