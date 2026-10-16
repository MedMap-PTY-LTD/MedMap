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

export interface PatientMembership {
  planId: 'free' | 'basic_premium' | 'premium_plus';
  status: 'active' | 'past_due' | 'expired';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd?: string | null;
  pendingPlanId?: 'basic_premium' | 'premium_plus' | null;
  pendingPlanEffectiveAt?: string | null;
  notifications?: MembershipNotification[];
  completedFreeBookings: number;
  freeBookingsRemaining: number;
  cancelAtPeriodEnd: boolean;
  canCancel: boolean;
  amount: number;
  frequencyLabel: 'quarterly' | null;
  paymentStatus: string | null;
}

export interface DoctorMembership {
  planId: 'free' | 'member' | 'partner';
  status: 'active' | 'past_due' | 'expired';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd?: string | null;
  pendingPlanId?: 'member' | 'partner' | null;
  pendingPlanEffectiveAt?: string | null;
  notifications?: MembershipNotification[];
  cancelAtPeriodEnd: boolean;
  canCancel: boolean;
  amount: number;
  frequencyLabel: 'monthly' | null;
  paymentStatus: string | null;
}

export interface MembershipNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string | null;
  read: boolean;
  stage: string | null;
}

export interface RefundCreditReview {
  id: string;
  bookingId?: string;
  patientId?: string;
  amount: number;
  amountCents?: number;
  customerEmail: string;
  customerName: string;
  doctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  reason?: string;
  reviewType?: string;
  status: string;
  createdAt: string;
}

export interface DoctorBookingStatistics {
  total: number;
  totalPatients: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

export interface PatientBookingFeeQuote {
  planId: PatientMembership['planId'];
  bookingFee: number;
  freeBookingsRemaining: number;
  freeBookingEligible: boolean;
  periodStart: string | null;
}

export interface AccountCreditTransaction {
  id: string;
  userId: string;
  amountCents: number;
  balanceAfterCents: number;
  kind: 'admin_refund' | 'admin_compensation' | 'booking_fee_debit' | 'booking_fee_return';
  reason: string;
  source: string;
  bookingId?: string;
  adminUid?: string;
  adminEmail?: string;
  createdAt: string;
}

export interface AccountCreditSummary {
  balanceCents: number;
  currency: 'ZAR';
  transactions: AccountCreditTransaction[];
}

const patientPlanPrices: Record<string, number> = {
  basic_premium: 39,
  premium_plus: 99,
};

const doctorPlanPrices: Record<string, number> = {
  member: 199,
  partner: 699,
};

export interface PayFastPublicConfig {
  mode: 'sandbox' | 'live';
  bookingFee: number;
  currency: 'ZAR';
}

const serviceUrl = (import.meta.env.VITE_BOOKING_SERVICE_URL || 'https://medmap-f4ob.onrender.com').replace(/\/$/, '');

const API_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 12_000];

async function fetchWithTransientRetry(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET';

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!canRetry || ![502, 503, 504].includes(response.status) || attempt >= API_RETRY_DELAYS_MS.length) {
        return response;
      }
    } catch (error) {
      if (!canRetry || attempt >= API_RETRY_DELAYS_MS.length) {
        if (canRetry && error instanceof TypeError) {
          throw new Error('The booking service is temporarily unavailable. Please try again shortly.');
        }
        throw error;
      }
    }

    await new Promise(resolve => setTimeout(resolve, API_RETRY_DELAYS_MS[attempt]));
  }
}

async function request(path: string, options: RequestInit = {}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to continue');
  const token = await user.getIdToken();
  const response = await fetchWithTransientRetry(`${serviceUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Booking service request failed (${response.status})`);
  return data;
}

export async function getPayFastConfig(): Promise<PayFastPublicConfig> {
  const response = await fetchWithTransientRetry(`${serviceUrl}/api/payments/payfast/config`, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
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
  const amount = Number(checkout.fields?.amount);
  if (checkout.action !== expectedAction ||
      !checkout.fields || !Number.isFinite(amount) || amount < 5 || amount > 10 ||
      !/^\d+\.\d{2}$/.test(checkout.fields.amount) ||
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

export function submitPatientMembershipCheckout(checkout: Checkout, planId: string): void {
  const amount = patientPlanPrices[planId];
  if (checkout.mode !== 'live' || checkout.action !== 'https://www.payfast.co.za/eng/process' ||
      !amount || !checkout.fields || checkout.fields.amount !== amount.toFixed(2) ||
      checkout.fields.recurring_amount !== amount.toFixed(2) ||
      checkout.fields.subscription_type !== '1' || checkout.fields.frequency !== '4' ||
      checkout.fields.cycles !== '0' || checkout.fields.payment_method !== 'cc' ||
      !checkout.fields.signature || !checkout.fields.merchant_id || !checkout.fields.merchant_key) {
    throw new Error('Invalid PayFast membership checkout response');
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

export function submitDoctorMembershipCheckout(checkout: Checkout, planId: string): void {
  const amount = doctorPlanPrices[planId];
  if (checkout.mode !== 'live' || checkout.action !== 'https://www.payfast.co.za/eng/process' ||
      !amount || !checkout.fields || checkout.fields.amount !== amount.toFixed(2) ||
      checkout.fields.recurring_amount !== amount.toFixed(2) ||
      checkout.fields.subscription_type !== '1' || checkout.fields.frequency !== '3' ||
      checkout.fields.cycles !== '0' || checkout.fields.payment_method !== 'cc' ||
      !checkout.fields.signature || !checkout.fields.merchant_id || !checkout.fields.merchant_key) {
    throw new Error('Invalid PayFast provider membership checkout response');
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

export async function getPatientMembership(): Promise<PatientMembership> {
  return request('/api/memberships/patient');
}

export async function getPatientBookingFeeQuote(): Promise<PatientBookingFeeQuote> {
  return request('/api/memberships/patient/booking-fee');
}

export async function getAccountCreditSummary(): Promise<AccountCreditSummary> {
  return request('/api/account-credit');
}

export async function lookupPatientAccountCredit(email: string): Promise<{
  user: { uid: string; email: string; fullName: string };
} & AccountCreditSummary> {
  return request(`/api/admin/account-credits/lookup?email=${encodeURIComponent(email)}`);
}

export async function issueAccountCredit(input: {
  userId: string;
  amount: string;
  kind: 'refund' | 'compensation';
  reason: string;
  source?: string;
}): Promise<{ success: boolean; balanceCents: number; transactionId: string }> {
  return request(`/api/admin/account-credits/${encodeURIComponent(input.userId)}`, {
    method: 'POST',
    body: JSON.stringify({ amount: input.amount, kind: input.kind, reason: input.reason, source: input.source }),
  });
}

export async function createPatientMembershipCheckout(planId: string): Promise<{
  planId: string;
  amount: number;
  checkout: Checkout;
}> {
  return request('/api/memberships/patient/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

export async function cancelPatientMembershipRenewal(): Promise<PatientMembership> {
  return request('/api/memberships/patient/cancel-renewal', { method: 'POST' });
}

export async function schedulePatientMembershipDowngrade(planId: string): Promise<PatientMembership> {
  return request('/api/memberships/patient/downgrade', { method: 'POST', body: JSON.stringify({ planId }) });
}

export async function getDoctorMembership(): Promise<DoctorMembership> {
  return request('/api/memberships/doctor');
}

export async function createDoctorMembershipCheckout(planId: string): Promise<{
  planId: string;
  amount: number;
  checkout: Checkout;
}> {
  return request('/api/memberships/doctor/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

export async function cancelDoctorMembershipRenewal(): Promise<DoctorMembership> {
  return request('/api/memberships/doctor/cancel-renewal', { method: 'POST' });
}

export async function scheduleDoctorMembershipDowngrade(planId: string): Promise<DoctorMembership> {
  return request('/api/memberships/doctor/downgrade', { method: 'POST', body: JSON.stringify({ planId }) });
}

export async function getPendingRefundCreditReviews(): Promise<RefundCreditReview[]> {
  return request('/api/admin/refunds/pending');
}

export async function issueRefundReviewCredit(refundId: string, reason: string): Promise<{ success: boolean; balanceCents: number }> {
  return request(`/api/admin/refunds/${encodeURIComponent(refundId)}/credit`, {
    method: 'POST', body: JSON.stringify({ reason }),
  });
}

export async function declineRefundCreditReview(refundId: string, reason: string): Promise<{ success: boolean }> {
  return request(`/api/admin/refunds/${encodeURIComponent(refundId)}/decline`, {
    method: 'POST', body: JSON.stringify({ reason }),
  });
}

export async function getDoctorBookingStatistics(doctorId: string): Promise<DoctorBookingStatistics> {
  return request(`/api/bookings/doctor/${encodeURIComponent(doctorId)}/stats`);
}

export async function createBookingAndPay(booking: BookingRequest): Promise<{ bookingId: string; bookingFee: number }> {
  const config = await getPayFastConfig();
  const data = await request('/api/bookings/create-with-payment', {
    method: 'POST',
    body: JSON.stringify({ ...booking, ...(config.mode === 'sandbox' ? { sandboxTest: true } : {}) }),
  });
  if (data.checkout) submitPayFastCheckout(data.checkout);
  return { bookingId: data.bookingId, bookingFee: Number(data.bookingFee) || 0 };
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
