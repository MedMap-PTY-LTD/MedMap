import { Booking, BookingSlot, BookingStats } from '../types';
export declare class BookingService {
    static generateDefaultSlots(date: string, duration?: number): BookingSlot[];
    static getAvailableSlots(doctorId: string, date: string): Promise<BookingSlot[]>;
    static updateSlotAvailability(doctorId: string, date: string, time: string, isAvailable: boolean, bookingId?: string): Promise<void>;
    static createBooking(bookingData: Omit<Booking, 'id' | 'status' | 'rescheduleCount' | 'maxReschedules' | 'rescheduleHistory' | 'createdAt' | 'updatedAt'>): Promise<{
        bookingId: string;
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
    }>;
    static updateBookingStatus(bookingId: string, status: Booking['status'], reason?: string): Promise<{
        success: boolean;
        error: string | null;
    }>;
    static setDayAvailability(doctorId: string, date: string, slots: BookingSlot[]): Promise<{
        success: boolean;
        error: string | null;
    }>;
}
//# sourceMappingURL=BookingService.d.ts.map