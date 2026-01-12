import { api } from '@/lib/django-api';

const PaymentsRepo = {
  async initiateMembershipPayment(membershipId: string, amount?: number) {
    const body: any = { membership_id: membershipId };
    if (amount !== undefined) body.amount = amount;
    const res = await api.request('/payments/paystack/membership/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to initiate membership payment: ${res.status} ${text}`);
    }
    return res.json();
  },
  async initiateBookingPayment(bookingId: string, amount: number) {
    const body = { booking_id: bookingId, amount };
    const res = await api.request('/payments/paystack/booking/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to initiate booking payment: ${res.status} ${text}`);
    }
    return res.json();
  },
};

export { PaymentsRepo };
export default PaymentsRepo;
