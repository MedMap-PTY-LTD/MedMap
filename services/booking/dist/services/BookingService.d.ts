import { Booking, BookingSlot, BookingStats } from '../types';
import { PayFastCheckout } from './PaymentService';
export declare class BookingService {
    static generateDefaultSlots(date: string, duration?: number): BookingSlot[];
    static getAvailableSlots(doctorId: string, date: string): Promise<BookingSlot[]>;
    static updateSlotAvailability(doctorId: string, date: string, time: string, isAvailable: boolean, bookingId?: string): Promise<void>;
    static createBooking(bookingData: Omit<Booking, 'id' | 'status' | 'rescheduleCount' | 'maxReschedules' | 'rescheduleHistory' | 'createdAt' | 'updatedAt' | 'paymentStatus' | 'paymentId' | 'paymentReference'>): Promise<{
        bookingId: string;
        bookingFee: number;
        bookingFeeCredit: number;
        bookingFeeTotal: number;
        membershipPlanId: string;
        freeBookingsRemaining: number;
        error: string | null;
    }>;
    static createBookingWithPayment(bookingData: Omit<Booking, 'id' | 'status' | 'rescheduleCount' | 'maxReschedules' | 'rescheduleHistory' | 'createdAt' | 'updatedAt' | 'paymentStatus' | 'paymentId' | 'paymentReference'>, paymentMethod?: string): Promise<{
        bookingId: string;
        checkout?: PayFastCheckout;
        bookingFee: number;
        bookingFeeCredit?: number;
        bookingFeeTotal?: number;
        membershipPlanId?: string;
        freeBookingsRemaining?: number;
        error: string | null;
    }>;
    static getBooking(bookingId: string): Promise<Booking | null>;
    static getDoctorBookings(doctorId: string, status?: string): Promise<Booking[]>;
    static getPatientBookings(patientId: string): Promise<Booking[]>;
    static getUpcomingBookings(doctorId: string): Promise<Booking[]>;
    static getBookingStats(doctorId: string): Promise<BookingStats>;
    static rescheduleBooking(bookingId: string, newDate: string, newTime: string, reason?: string): Promise<{
        success: boolean;
        error: string | null;
    }>;
    static cancelBooking(bookingId: string, reason?: string): Promise<{
        success: boolean;
        error: string | null;
        creditReviewPending?: boolean;
    }>;
    static markRefundProcessed(bookingId: string, refundReference?: string): Promise<{
        success: boolean;
        error: string | null;
    }>;
    static getPendingRefunds(): Promise<any[]>;
    static updateBookingStatus(bookingId: string, status: Booking['status'], reason?: string): Promise<{
        success: boolean;
        error: string | null;
    }>;
    static setDayAvailability(doctorId: string, date: string, slots: BookingSlot[]): Promise<{
        success: boolean;
        error: string | null;
    }>;
    static markBookingAsPaid(bookingId: string, pfPaymentId: string, paymentReference: string): Promise<{
        success: boolean;
        error: string | null;
    }>;
    static markBookingPaymentFailed(bookingId: string, reason?: string): Promise<{
        success: boolean;
        error: string | null;
    }>;
}
//# sourceMappingURL=BookingService.d.ts.map