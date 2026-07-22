// src/handlers/socketHandlers.ts
import { Socket } from 'socket.io';
import { BookingService } from '../services/BookingService';
import { BookingEvents, Booking } from '../types';

interface SocketHandlerDependencies {
  io: any;
  socket: Socket;
}

export class SocketHandlers {
  private io: any;
  private socket: Socket;

  constructor({ io, socket }: SocketHandlerDependencies) {
    this.io = io;
    this.socket = socket;
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Join rooms
    this.socket.on(BookingEvents.JOIN_DOCTOR, (doctorId: string) => {
      this.handleJoinDoctor(doctorId);
    });

    this.socket.on(BookingEvents.JOIN_PATIENT, (patientId: string) => {
      this.handleJoinPatient(patientId);
    });

    // Leave rooms
    this.socket.on(BookingEvents.LEAVE_DOCTOR, (doctorId: string) => {
      this.handleLeaveDoctor(doctorId);
    });

    this.socket.on(BookingEvents.LEAVE_PATIENT, (patientId: string) => {
      this.handleLeavePatient(patientId);
    });

    // Booking operations
    this.socket.on(BookingEvents.CREATE_BOOKING, (data, callback) => {
      this.handleCreateBooking(data, callback);
    });

    this.socket.on(BookingEvents.RESCHEDULE_BOOKING, (data, callback) => {
      this.handleRescheduleBooking(data, callback);
    });

    this.socket.on(BookingEvents.CANCEL_BOOKING, (data, callback) => {
      this.handleCancelBooking(data, callback);
    });

    this.socket.on(BookingEvents.UPDATE_STATUS, (data, callback) => {
      this.handleUpdateStatus(data, callback);
    });

    // Query operations
    this.socket.on(BookingEvents.GET_SLOTS, (data, callback) => {
      this.handleGetSlots(data, callback);
    });

    this.socket.on(BookingEvents.GET_BOOKINGS, (data, callback) => {
      this.handleGetBookings(data, callback);
    });

    this.socket.on(BookingEvents.GET_UPCOMING, (data, callback) => {
      this.handleGetUpcoming(data, callback);
    });

    this.socket.on(BookingEvents.GET_STATS, (data, callback) => {
      this.handleGetStats(data, callback);
    });

    this.socket.on(BookingEvents.SET_AVAILABILITY, (data, callback) => {
      this.handleSetAvailability(data, callback);
    });
  }

  // ==================== ROOM HANDLERS ====================

  private handleJoinDoctor(doctorId: string): void {
    this.socket.join(`doctor_${doctorId}`);
    console.log(`👨‍⚕️ Client ${this.socket.id} joined doctor room: ${doctorId}`);
  }

  private handleJoinPatient(patientId: string): void {
    this.socket.join(`patient_${patientId}`);
    console.log(`👤 Client ${this.socket.id} joined patient room: ${patientId}`);
  }

  private handleLeaveDoctor(doctorId: string): void {
    this.socket.leave(`doctor_${doctorId}`);
    console.log(`👨‍⚕️ Client ${this.socket.id} left doctor room: ${doctorId}`);
  }

  private handleLeavePatient(patientId: string): void {
    this.socket.leave(`patient_${patientId}`);
    console.log(`👤 Client ${this.socket.id} left patient room: ${patientId}`);
  }

  // ==================== BOOKING HANDLERS ====================

  private async handleCreateBooking(data: any, callback: Function): Promise<void> {
    try {
      const result = await BookingService.createBooking(data);
      
      if (result.bookingId) {
        // Emit to doctor and patient rooms
        this.io.to(`doctor_${data.doctorId}`).emit(BookingEvents.BOOKING_CREATED, {
          bookingId: result.bookingId,
          ...data,
        });
        this.io.to(`patient_${data.patientId}`).emit(BookingEvents.BOOKING_CREATED, {
          bookingId: result.bookingId,
          ...data,
        });

        // Emit availability update
        this.io.to(`doctor_${data.doctorId}`).emit(BookingEvents.AVAILABILITY_UPDATED, {
          doctorId: data.doctorId,
          date: data.appointmentDate,
          time: data.appointmentTime,
          isAvailable: false,
        });
      }
      
      callback(result);
    } catch (error: any) {
      callback({ bookingId: '', error: error.message });
    }
  }

  private async handleRescheduleBooking(data: any, callback: Function): Promise<void> {
    try {
      const booking = await BookingService.getBooking(data.bookingId);
      
      if (!booking) {
        callback({ success: false, error: 'Booking not found' });
        return;
      }

      const result = await BookingService.rescheduleBooking(
        data.bookingId,
        data.newDate,
        data.newTime,
        data.reason
      );
      
      if (result.success) {
        // Emit to doctor and patient rooms
        this.io.to(`doctor_${booking.doctorId}`).emit(BookingEvents.BOOKING_RESCHEDULED, {
          bookingId: data.bookingId,
          newDate: data.newDate,
          newTime: data.newTime,
          rescheduleCount: booking.rescheduleCount + 1,
          maxReschedules: booking.maxReschedules,
        });
        this.io.to(`patient_${booking.patientId}`).emit(BookingEvents.BOOKING_RESCHEDULED, {
          bookingId: data.bookingId,
          newDate: data.newDate,
          newTime: data.newTime,
          rescheduleCount: booking.rescheduleCount + 1,
          maxReschedules: booking.maxReschedules,
        });

        // Emit availability updates
        this.io.to(`doctor_${booking.doctorId}`).emit(BookingEvents.AVAILABILITY_UPDATED, {
          doctorId: booking.doctorId,
          date: booking.appointmentDate,
          time: booking.appointmentTime,
          isAvailable: true,
        });
        this.io.to(`doctor_${booking.doctorId}`).emit(BookingEvents.AVAILABILITY_UPDATED, {
          doctorId: booking.doctorId,
          date: data.newDate,
          time: data.newTime,
          isAvailable: false,
        });
      }
      
      callback(result);
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }

  private async handleCancelBooking(data: any, callback: Function): Promise<void> {
    try {
      const booking = await BookingService.getBooking(data.bookingId);
      
      if (!booking) {
        callback({ success: false, error: 'Booking not found' });
        return;
      }

      const result = await BookingService.cancelBooking(data.bookingId, data.reason);
      
      if (result.success) {
        // Emit to doctor and patient rooms
        this.io.to(`doctor_${booking.doctorId}`).emit(BookingEvents.BOOKING_CANCELLED, {
          bookingId: data.bookingId,
          reason: data.reason || 'Cancelled by patient',
        });
        this.io.to(`patient_${booking.patientId}`).emit(BookingEvents.BOOKING_CANCELLED, {
          bookingId: data.bookingId,
          reason: data.reason || 'Cancelled by patient',
        });

        // Emit availability update
        this.io.to(`doctor_${booking.doctorId}`).emit(BookingEvents.AVAILABILITY_UPDATED, {
          doctorId: booking.doctorId,
          date: booking.appointmentDate,
          time: booking.appointmentTime,
          isAvailable: true,
        });
      }
      
      callback(result);
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }

  private async handleUpdateStatus(data: any, callback: Function): Promise<void> {
    try {
      const booking = await BookingService.getBooking(data.bookingId);
      
      if (!booking) {
        callback({ success: false, error: 'Booking not found' });
        return;
      }

      const result = await BookingService.updateBookingStatus(
        data.bookingId,
        data.status,
        data.reason
      );
      
      if (result.success) {
        // Emit to doctor and patient rooms
        this.io.to(`doctor_${booking.doctorId}`).emit(BookingEvents.BOOKING_UPDATED, {
          bookingId: data.bookingId,
          status: data.status,
          reason: data.reason,
        });
        this.io.to(`patient_${booking.patientId}`).emit(BookingEvents.BOOKING_UPDATED, {
          bookingId: data.bookingId,
          status: data.status,
          reason: data.reason,
        });
      }
      
      callback(result);
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }

  // ==================== QUERY HANDLERS ====================

  private async handleGetSlots(data: any, callback: Function): Promise<void> {
    try {
      const slots = await BookingService.getAvailableSlots(data.doctorId, data.date);
      callback({ success: true, slots });
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }

  private async handleGetBookings(data: any, callback: Function): Promise<void> {
    try {
      let bookings: Booking[] = [];
      
      if (data.role === 'doctor') {
        bookings = await BookingService.getDoctorBookings(data.userId, data.status);
      } else {
        bookings = await BookingService.getPatientBookings(data.userId);
      }
      
      callback({ success: true, bookings });
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }

  private async handleGetUpcoming(data: any, callback: Function): Promise<void> {
    try {
      const bookings = await BookingService.getUpcomingBookings(data.doctorId);
      callback({ success: true, bookings });
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }

  private async handleGetStats(data: any, callback: Function): Promise<void> {
    try {
      const stats = await BookingService.getBookingStats(data.doctorId);
      callback({ success: true, stats });
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }

  private async handleSetAvailability(data: any, callback: Function): Promise<void> {
    try {
      const result = await BookingService.setDayAvailability(
        data.doctorId,
        data.date,
        data.slots
      );
      
      if (result.success) {
        // Emit availability update
        this.io.to(`doctor_${data.doctorId}`).emit(BookingEvents.AVAILABILITY_UPDATED, {
          doctorId: data.doctorId,
          date: data.date,
          slots: data.slots,
        });
      }
      
      callback(result);
    } catch (error: any) {
      callback({ success: false, error: error.message });
    }
  }
}