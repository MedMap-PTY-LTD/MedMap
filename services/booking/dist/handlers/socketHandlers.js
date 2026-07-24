"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketHandlers = void 0;
const BookingService_1 = require("../services/BookingService");
const types_1 = require("../types");
class SocketHandlers {
    constructor({ io, socket }) {
        this.io = io;
        this.socket = socket;
        this.registerHandlers();
    }
    registerHandlers() {
        // Join rooms
        this.socket.on(types_1.BookingEvents.JOIN_DOCTOR, (doctorId) => {
            this.handleJoinDoctor(doctorId);
        });
        this.socket.on(types_1.BookingEvents.JOIN_PATIENT, (patientId) => {
            this.handleJoinPatient(patientId);
        });
        this.socket.on(types_1.BookingEvents.LEAVE_DOCTOR, (doctorId) => {
            this.handleLeaveDoctor(doctorId);
        });
        this.socket.on(types_1.BookingEvents.LEAVE_PATIENT, (patientId) => {
            this.handleLeavePatient(patientId);
        });
        // Booking operations
        this.socket.on(types_1.BookingEvents.CREATE_BOOKING, (data, callback) => {
            this.handleCreateBooking(data, callback);
        });
        this.socket.on(types_1.BookingEvents.RESCHEDULE_BOOKING, (data, callback) => {
            this.handleRescheduleBooking(data, callback);
        });
        this.socket.on(types_1.BookingEvents.CANCEL_BOOKING, (data, callback) => {
            this.handleCancelBooking(data, callback);
        });
        this.socket.on(types_1.BookingEvents.UPDATE_STATUS, (data, callback) => {
            this.handleUpdateStatus(data, callback);
        });
        // Query operations
        this.socket.on(types_1.BookingEvents.GET_SLOTS, (data, callback) => {
            this.handleGetSlots(data, callback);
        });
        this.socket.on(types_1.BookingEvents.GET_BOOKINGS, (data, callback) => {
            this.handleGetBookings(data, callback);
        });
        this.socket.on(types_1.BookingEvents.GET_UPCOMING, (data, callback) => {
            this.handleGetUpcoming(data, callback);
        });
        this.socket.on(types_1.BookingEvents.GET_STATS, (data, callback) => {
            this.handleGetStats(data, callback);
        });
        this.socket.on(types_1.BookingEvents.SET_AVAILABILITY, (data, callback) => {
            this.handleSetAvailability(data, callback);
        });
    }
    // ==================== ROOM HANDLERS ====================
    handleJoinDoctor(doctorId) {
        this.socket.join(`doctor_${doctorId}`);
        console.log(`👨‍⚕️ Client ${this.socket.id} joined doctor room: ${doctorId}`);
    }
    handleJoinPatient(patientId) {
        this.socket.join(`patient_${patientId}`);
        console.log(`👤 Client ${this.socket.id} joined patient room: ${patientId}`);
    }
    handleLeaveDoctor(doctorId) {
        this.socket.leave(`doctor_${doctorId}`);
        console.log(`👨‍⚕️ Client ${this.socket.id} left doctor room: ${doctorId}`);
    }
    handleLeavePatient(patientId) {
        this.socket.leave(`patient_${patientId}`);
        console.log(`👤 Client ${this.socket.id} left patient room: ${patientId}`);
    }
    // ==================== BOOKING HANDLERS ====================
    async handleCreateBooking(data, callback) {
        try {
            console.log('📝 Creating booking:', data);
            const result = await BookingService_1.BookingService.createBooking(data);
            if (result.bookingId) {
                // Emit to doctor and patient rooms
                this.io.to(`doctor_${data.doctorId}`).emit(types_1.BookingEvents.BOOKING_CREATED, {
                    bookingId: result.bookingId,
                    ...data,
                });
                this.io.to(`patient_${data.patientId}`).emit(types_1.BookingEvents.BOOKING_CREATED, {
                    bookingId: result.bookingId,
                    ...data,
                });
                // Emit availability update
                this.io.to(`doctor_${data.doctorId}`).emit(types_1.BookingEvents.AVAILABILITY_UPDATED, {
                    doctorId: data.doctorId,
                    date: data.appointmentDate,
                    time: data.appointmentTime,
                    isAvailable: false,
                });
            }
            callback(result);
        }
        catch (error) {
            console.error('❌ Error creating booking:', error);
            callback({ bookingId: '', error: error.message });
        }
    }
    async handleRescheduleBooking(data, callback) {
        try {
            console.log('🔄 Rescheduling booking:', data);
            const booking = await BookingService_1.BookingService.getBooking(data.bookingId);
            if (!booking) {
                callback({ success: false, error: 'Booking not found' });
                return;
            }
            const result = await BookingService_1.BookingService.rescheduleBooking(data.bookingId, data.newDate, data.newTime, data.reason);
            if (result.success) {
                // Emit to doctor and patient rooms
                this.io.to(`doctor_${booking.doctorId}`).emit(types_1.BookingEvents.BOOKING_RESCHEDULED, {
                    bookingId: data.bookingId,
                    newDate: data.newDate,
                    newTime: data.newTime,
                    rescheduleCount: booking.rescheduleCount + 1,
                    maxReschedules: booking.maxReschedules,
                });
                this.io.to(`patient_${booking.patientId}`).emit(types_1.BookingEvents.BOOKING_RESCHEDULED, {
                    bookingId: data.bookingId,
                    newDate: data.newDate,
                    newTime: data.newTime,
                    rescheduleCount: booking.rescheduleCount + 1,
                    maxReschedules: booking.maxReschedules,
                });
                // Emit availability updates
                this.io.to(`doctor_${booking.doctorId}`).emit(types_1.BookingEvents.AVAILABILITY_UPDATED, {
                    doctorId: booking.doctorId,
                    date: booking.appointmentDate,
                    time: booking.appointmentTime,
                    isAvailable: true,
                });
                this.io.to(`doctor_${booking.doctorId}`).emit(types_1.BookingEvents.AVAILABILITY_UPDATED, {
                    doctorId: booking.doctorId,
                    date: data.newDate,
                    time: data.newTime,
                    isAvailable: false,
                });
            }
            callback(result);
        }
        catch (error) {
            console.error('❌ Error rescheduling booking:', error);
            callback({ success: false, error: error.message });
        }
    }
    async handleCancelBooking(data, callback) {
        try {
            console.log('❌ Cancelling booking:', data);
            const booking = await BookingService_1.BookingService.getBooking(data.bookingId);
            if (!booking) {
                callback({ success: false, error: 'Booking not found' });
                return;
            }
            const result = await BookingService_1.BookingService.cancelBooking(data.bookingId, data.reason);
            if (result.success) {
                // Emit to doctor and patient rooms
                this.io.to(`doctor_${booking.doctorId}`).emit(types_1.BookingEvents.BOOKING_CANCELLED, {
                    bookingId: data.bookingId,
                    reason: data.reason || 'Cancelled by patient',
                });
                this.io.to(`patient_${booking.patientId}`).emit(types_1.BookingEvents.BOOKING_CANCELLED, {
                    bookingId: data.bookingId,
                    reason: data.reason || 'Cancelled by patient',
                });
                // Emit availability update
                this.io.to(`doctor_${booking.doctorId}`).emit(types_1.BookingEvents.AVAILABILITY_UPDATED, {
                    doctorId: booking.doctorId,
                    date: booking.appointmentDate,
                    time: booking.appointmentTime,
                    isAvailable: true,
                });
            }
            callback(result);
        }
        catch (error) {
            console.error('❌ Error cancelling booking:', error);
            callback({ success: false, error: error.message });
        }
    }
    async handleUpdateStatus(data, callback) {
        try {
            console.log('📊 Updating booking status:', data);
            const booking = await BookingService_1.BookingService.getBooking(data.bookingId);
            if (!booking) {
                callback({ success: false, error: 'Booking not found' });
                return;
            }
            const result = await BookingService_1.BookingService.updateBookingStatus(data.bookingId, data.status, data.reason);
            if (result.success) {
                // Emit to doctor and patient rooms
                this.io.to(`doctor_${booking.doctorId}`).emit(types_1.BookingEvents.BOOKING_UPDATED, {
                    bookingId: data.bookingId,
                    status: data.status,
                    reason: data.reason,
                });
                this.io.to(`patient_${booking.patientId}`).emit(types_1.BookingEvents.BOOKING_UPDATED, {
                    bookingId: data.bookingId,
                    status: data.status,
                    reason: data.reason,
                });
            }
            callback(result);
        }
        catch (error) {
            console.error('❌ Error updating booking status:', error);
            callback({ success: false, error: error.message });
        }
    }
    // ==================== QUERY HANDLERS ====================
    async handleGetSlots(data, callback) {
        try {
            console.log('📡 Getting slots for:', { doctorId: data.doctorId, date: data.date });
            if (!data.doctorId || !data.date) {
                console.log('⚠️ Missing doctorId or date:', data);
                callback({
                    success: false,
                    error: 'Missing doctorId or date',
                    slots: []
                });
                return;
            }
            const slots = await BookingService_1.BookingService.getAvailableSlots(data.doctorId, data.date);
            console.log(`✅ Found ${slots.length} slots for ${data.doctorId} on ${data.date}`);
            callback({
                success: true,
                slots: slots || [],
                count: slots?.length || 0
            });
        }
        catch (error) {
            console.error('❌ Error getting slots:', error);
            callback({
                success: true,
                slots: [],
                count: 0,
                error: error.message
            });
        }
    }
    async handleGetBookings(data, callback) {
        try {
            console.log('📋 Getting bookings for:', data);
            let bookings = [];
            if (data.role === 'doctor') {
                bookings = await BookingService_1.BookingService.getDoctorBookings(data.userId, data.status);
            }
            else {
                bookings = await BookingService_1.BookingService.getPatientBookings(data.userId);
            }
            console.log(`✅ Found ${bookings.length} bookings`);
            callback({ success: true, bookings });
        }
        catch (error) {
            console.error('❌ Error getting bookings:', error);
            callback({ success: false, error: error.message, bookings: [] });
        }
    }
    async handleGetUpcoming(data, callback) {
        try {
            console.log('📅 Getting upcoming bookings for:', data);
            const bookings = await BookingService_1.BookingService.getUpcomingBookings(data.doctorId);
            console.log(`✅ Found ${bookings.length} upcoming bookings`);
            callback({ success: true, bookings });
        }
        catch (error) {
            console.error('❌ Error getting upcoming bookings:', error);
            callback({ success: false, error: error.message, bookings: [] });
        }
    }
    async handleGetStats(data, callback) {
        try {
            console.log('📊 Getting stats for:', data);
            const stats = await BookingService_1.BookingService.getBookingStats(data.doctorId);
            callback({ success: true, stats });
        }
        catch (error) {
            console.error('❌ Error getting stats:', error);
            callback({ success: false, error: error.message, stats: null });
        }
    }
    async handleSetAvailability(data, callback) {
        try {
            console.log('📝 Setting availability for:', { doctorId: data.doctorId, date: data.date, slots: data.slots?.length });
            const result = await BookingService_1.BookingService.setDayAvailability(data.doctorId, data.date, data.slots);
            if (result.success) {
                // Emit availability update
                this.io.to(`doctor_${data.doctorId}`).emit(types_1.BookingEvents.AVAILABILITY_UPDATED, {
                    doctorId: data.doctorId,
                    date: data.date,
                    slots: data.slots,
                });
            }
            callback(result);
        }
        catch (error) {
            console.error('❌ Error setting availability:', error);
            callback({ success: false, error: error.message });
        }
    }
}
exports.SocketHandlers = SocketHandlers;
//# sourceMappingURL=socketHandlers.js.map