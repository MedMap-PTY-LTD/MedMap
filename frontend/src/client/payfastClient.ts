import { auth } from '@/lib/firebase';

export interface BookingRequest {
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

interface Checkout {
  mode: 'sandbox' | 'live';
  action: string;
  fields: Record<string, string>;
}

export interface PayFastPublicConfig {
  mode: 'sandbox' | 'live';
  bookingFee: number;
  currency: 'ZAR';
}

const serviceUrl = (import.meta.env.VITE_BOOKING_SERVICE_URL || 'https://medmap-f4ob.onrender.com').replace(/\/$/, '');

async function request(path: string, options: RequestInit = {}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to continue');
  const token = await user.getIdToken();
  const response = await fetch(`${serviceUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Booking service request failed');
  return data;
}

export async function getPayFastConfig(): Promise<PayFastPublicConfig> {
  const response = await fetch(`${serviceUrl}/api/payments/payfast/config`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !['sandbox', 'live'].includes(data.mode) ||
      !Number.isFinite(data.bookingFee) || data.currency !== 'ZAR') {
    throw new Error(data.error || 'Payment configuration is unavailable');
  }
  return data as PayFastPublicConfig;
}

export function submitPayFastCheckout(checkout: Checkout): void {
  const expectedAction = checkout.mode === 'sandbox'
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
  if (checkout.action !== expectedAction ||
      !checkout.fields || checkout.fields.amount !== '10.00' ||
      !checkout.fields.signature || !checkout.fields.merchant_id || !checkout.fields.merchant_key) {
    throw new Error('Invalid PayFast checkout response');
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout.action;
  form.style.display = 'none';
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export async function createBookingAndPay(booking: BookingRequest): Promise<void> {
  const config = await getPayFastConfig();
  const data = await request('/api/bookings/create-with-payment', {
    method: 'POST',
    body: JSON.stringify({ ...booking, ...(config.mode === 'sandbox' ? { sandboxTest: true } : {}) }),
  });
  if (!data.checkout) throw new Error('PayFast checkout was not created');
  submitPayFastCheckout(data.checkout);
}

export async function retryBookingPayment(bookingId: string): Promise<void> {
  const data = await request(`/api/bookings/${encodeURIComponent(bookingId)}/payfast-checkout`, {
    method: 'POST',
  });
  submitPayFastCheckout(data.checkout);
}

export async function getBookingPaymentDetails(bookingId: string): Promise<{
  paymentStatus: string;
  paymentEnvironment?: 'sandbox' | 'live';
  bookingFee?: number;
}> {
  const booking = await request(`/api/bookings/${encodeURIComponent(bookingId)}`);
  return {
    paymentStatus: booking.paymentStatus || 'unpaid',
    paymentEnvironment: booking.paymentEnvironment,
    bookingFee: booking.bookingFee,
  };
}

export async function cancelBookingRequest(bookingId: string): Promise<void> {
  const result = await request(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Cancelled by patient' }),
  });
  if (!result.success) throw new Error(result.error || 'Could not cancel booking');
}

export async function getPatientBookings(patientId: string) {
  return request('/api/bookings/patient/' + encodeURIComponent(patientId));
}
