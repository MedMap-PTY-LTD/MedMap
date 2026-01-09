import { api } from '../../lib/django-api';

export const PaymentsRepo = {
    async listTransactions() {
        const response = await api.request('/payments/transactions/', {
            method: 'GET'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch transactions');
        }
        return response.json();
    },

    async initiateBookingPayment(bookingId: string | number, amount: number) {
        const response = await api.request('/payments/paystack/booking/', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.error || 'Failed to initiate booking payment');
        }
        
        const data = await response.json();
        
        // Paystack returns { status: true, message: "...", data: { authorization_url: "...", ... } }
        // Our service returns the data object directly if successful from PaystackService
        
        if (data.data && data.data.authorization_url) {
            window.location.href = data.data.authorization_url;
        } else if (data.authorization_url) {
             window.location.href = data.authorization_url;
        } else {
            throw new Error('Invalid payment response from server');
        }
        
        return data;
    },

    async initiateMembershipPayment(plan: string) {
        console.log('🚀 Starting membership payment for plan:', plan);
        
        const response = await api.request('/payments/paystack/membership/', {
            method: 'POST',
            body: JSON.stringify({
                plan: plan
            })
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.error || 'Failed to initiate membership payment');
        }
        
        const data = await response.json();
        console.log('📦 Payment data received:', data);
        
        // Paystack returns { status: true, message: "...", data: { authorization_url: "...", ... } }
        
        if (data.data && data.data.authorization_url) {
            console.log('✅ Redirecting to Paystack:', data.data.authorization_url);
            window.location.href = data.data.authorization_url;
        } else if (data.authorization_url) {
             console.log('✅ Redirecting to Paystack:', data.authorization_url);
             window.location.href = data.authorization_url;
        } else {
            console.error('❌ Invalid payment response:', data);
            throw new Error('Invalid payment response from server');
        }
        
        return data;
    }
};
