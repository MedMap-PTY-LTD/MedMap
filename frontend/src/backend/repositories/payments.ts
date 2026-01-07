import { api } from '../../lib/django-api';

export const PaymentsRepo = {
    async listTransactions() {
        const response = await api.request('/payments/transactions/', {
            method: 'GET',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch transactions');
        }
        return response.json();
    },

    // Initiate a booking payment with Paystack
    async initiateBookingPayment(bookingId: string | number) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('User not authenticated');

        const response = await fetch(`/api/payments/paystack/booking/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ booking_id: bookingId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initiate booking payment');
        }

        const data = await response.json();
        if (!data.checkout_url) {
            throw new Error('Invalid payment response from server');
        }

        // Redirect user to Paystack checkout
        window.location.href = data.checkout_url;

        return data;
    },

    // Initiate a membership payment with Paystack
    async initiateMembershipPayment(plan: string) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('User not authenticated');

        const response = await fetch(`/api/payments/paystack/membership/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ plan }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initiate membership payment');
        }

        const data = await response.json();
        if (!data.checkout_url) {
            throw new Error('Invalid payment response from server');
        }

        // Redirect user to Paystack checkout
        window.location.href = data.checkout_url;

        return data;
    },
};
