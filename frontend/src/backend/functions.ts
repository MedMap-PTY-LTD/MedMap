import { api } from '@/lib/django-api';
import { BookingsRepo } from './repositories/bookings';
import { DoctorsRepo } from './repositories/doctors';
import PaymentsRepo from './repositories/payments';

// Mocking the behavior for migration
async function invokeMock(name: string, body?: any): Promise<any> {
    console.warn(`EdgeFunction ${name} is being called via Django migration layer.`);
    
    if (name === 'create-booking') {
        return BookingsRepo.create(body);
    }
    if (name === 'submit-doctor-enrollment') {
        return DoctorsRepo.create(body);
    }
    
    throw new Error(`Function ${name} not implemented in Django migration.`);
}

export const EdgeFunctions = {
  invoke: invokeMock,
  adminData: async () => {
      // Map to admin dashboard stats
      // We might need to implement this endpoint in Django: /system/admin_stats/
      // For now, return mock or try to fetch from a new endpoint
      try {
        const response = await api.request('/system/settings/admin_stats/'); 
        if (!response.ok) {
             // Fallback to local calculation if endpoint missing
             return { totalDoctors: 0, pendingApplications: 0, totalBookings: 0, totalRevenue: 0 };
        }
        return response.json();
      } catch (e) {
          return {};
      }
  },
  createBooking: (payload: any) => BookingsRepo.create(payload),
  createPaystackPayment: async (payload: any) => {
      // payload: { booking_id, amount } or { membership_id, amount }
      if (payload.booking_id) {
         const res = await PaymentsRepo.initiateBookingPayment(payload.booking_id, payload.amount);
         return res; // expected { payment_url, reference } or Paystack response
      }
      if (payload.membership_id) {
         const res = await PaymentsRepo.initiateMembershipPayment(payload.membership_id, payload.amount);
         return res;
      }
      throw new Error('Invalid payload for createPaystackPayment');
  },
  createPaystackMembership: async (payload: any) => {
      const res = await PaymentsRepo.initiateMembershipPayment(payload.membership_id || payload.id, payload.amount);
      return res;
  },
  submitDoctorEnrollment: (payload: any) => DoctorsRepo.create(payload),
  sendEmail: (payload: any) => {
      console.log("Mock sending email:", payload);
      return Promise.resolve({ success: true });
  },
  // Admin auth stuff - handled by Django auth now
  verifyAdminInvite: (payload: any) => Promise.resolve({ success: true }),
  verifyAdminPassword: (payload: any) => Promise.resolve({ success: true }),
  realtimeToken: (payload: any) => Promise.resolve({ token: 'mock-token' }),
  generateAdminInvite: (payload: any) => Promise.resolve({ invite: 'mock-invite' }),
};

export type { };
