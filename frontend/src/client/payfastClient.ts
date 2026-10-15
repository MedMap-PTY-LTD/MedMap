import { auth } from '@/lib/firebase';

export interface BookingRequest {
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

interface Checkout {
  action: string;
  fields: Record<string, string>;
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

export function submitPayFastCheckout(checkout: Checkout): void {
  if (checkout.action !== 'https://sandbox.payfast.co.za/eng/process' ||
      !checkout.fields || checkout.fields.amount !== '10.00' ||
      !checkout.fields.signature) {
    throw new Error('Invalid sandbox checkout response');
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
  const data = await request('/api/bookings/create-with-payment', {
    method: 'POST',
    body: JSON.stringify({ ...booking, sandboxTest: true }),
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

export async function getBookingPaymentStatus(bookingId: string): Promise<string> {
  const booking = await request(`/api/bookings/${encodeURIComponent(bookingId)}`);
  return booking.paymentStatus || 'unpaid';
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