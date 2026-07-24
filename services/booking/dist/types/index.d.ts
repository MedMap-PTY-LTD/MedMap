export interface BookingSlot {
    date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    doctorId: string;
    bookingId?: string;
}
export interface RescheduleHistory {
    fromDate: string;
    fromTime: string;
    toDate: string;
    toTime: string;
    rescheduledAt: any;
    reason?: string;
}
export interface Booking {
    id: string;
    doctorId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    doctorName: string;
    doctorSpecialization: string;
    appointmentDate: string;
    appointmentTime: string;
    endTime: string;
    status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no-show';
    notes?: string;
    consultationFee: number;
    rescheduleCount: number;
    maxReschedules: number;
    rescheduleHistory: RescheduleHistory[];
    createdAt: any;
    updatedAt: any;
    cancelledAt?: any;
    cancellationReason?: string;
    confirmedAt?: any;
    completedAt?: any;
}
export interface DoctorAvailability {
    doctorId: string;
    date: string;
    slots: BookingSlot[];
    updatedAt: any;
}
export interface BookingStats {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    revenue: number;
}
export declare enum BookingEvents {
    CREATE_BOOKING = "create:booking",
    RESCHEDULE_BOOKING = "reschedule:booking",
    CANCEL_BOOKING = "cancel:booking",
    UPDATE_STATUS = "update:booking-status",
    GET_SLOTS = "get:slots",
    GET_BOOKINGS = "get:bookings",
    GET_UPCOMING = "get:upcoming",
    GET_STATS = "get:stats",
    SET_AVAILABILITY = "set:availability",
    JOIN_DOCTOR = "join:doctor",
    JOIN_PATIENT = "join:patient",
    LEAVE_DOCTOR = "leave:doctor",
    LEAVE_PATIENT = "leave:patient",
    BOOKING_CREATED = "booking:created",
    BOOKING_RESCHEDULED = "booking:rescheduled",
    BOOKING_CANCELLED = "booking:cancelled",
    BOOKING_UPDATED = "booking:updated",
    AVAILABILITY_UPDATED = "availability:updated"
}
//# sourceMappingURL=index.d.ts.map