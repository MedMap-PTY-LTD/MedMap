// backend/repositories/payments.ts
export const PaymentsRepo = {
  /**
   * Initiate Paystack payment for a booking
   * @param bookingId - the backend booking ID
   * @param amount - amount to charge (in rands)
   * @param email - patient's email
   */
  initiatePaystackBookingPayment: async (bookingId: number, amount: number, email: string) => {
    const res = await fetch(`/api/payments/booking/${bookingId}/paystack/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');
    window.location.href = data.payment_url; // redirect to Paystack
  },

  /**
   * Initiate Paystack payment for a membership
   * @param membershipId - identifier for the membership plan
   * @param amount - amount to charge
   * @param email - user's email
   */
  initiatePaystackMembershipPayment: async (membershipId: string, amount: number, email: string) => {
    const res = await fetch(`/api/payments/membership/${membershipId}/paystack/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');
    window.location.href = data.payment_url; // redirect to Paystack
  }
};
