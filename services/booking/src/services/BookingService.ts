// src/services/BookingService.ts
import { db } from '../config/firebase';
import { 
  Booking, 
  BookingSlot, 
  DoctorAvailability, 
  BookingStats,
  RescheduleHistory 
} from '../types';

const MAX_RESCHEDULES = 2;
const DEFAULT_CONSULTATION_DURATION = 30;
const SLOT_INTERVAL = 30;

export class BookingService {
  
  // Generate default slots (8 AM - 5 PM)
  static generateDefaultSlots(date: string, duration: number = DEFAULT_CONSULTATION_DURATION): BookingSlot[] {
    const slots: BookingSlot[] = [];
    const startHour = 8;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const totalMinutes = hour * 60 + minute + duration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        
        if (endHours < 17 || (endHours === 17 && endMinutes === 0)) {
          slots.push({
            date,
            startTime: timeStr,
            endTime: endTimeStr,
            isAvailable: true,
            doctorId: '',
          });
        }
      }
    }

    return slots;
  }

  // Get available slots for a doctor
  static async getAvailableSlots(doctorId: string, date: string): Promise<BookingSlot[]> {
    try {
      const docRef = db.collection('doctorAvailability').doc(`${doctorId}_${date}`);
      const docSnap = await docRef.get();

      let slots: BookingSlot[] = [];

      if (docSnap.exists) {
        const data = docSnap.data() as DoctorAvailability;
        slots = data.slots || [];
      } else {
        slots = this.generateDefaultSlots(date);
      }

      // Get booked slots
      const bookingsSnapshot = await db.collection('bookings')
        .where('doctorId', '==', doctorId)
        .where('appointmentDate', '==', date)
        .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])
        .get();

      const bookedTimes = new Set();
      bookingsSnapshot.forEach(doc => {
        const data = doc.data();
        bookedTimes.add(data.appointmentTime);
      });

      return slots.map(slot => ({
        ...slot,
        isAvailable: slot.isAvailable && !bookedTimes.has(slot.startTime),
      }));
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  // Update slot availability
  static async updateSlotAvailability(
    doctorId: string, 
    date: string, 
    time: string, 
    isAvailable: boolean,
    bookingId?: string
  ): Promise<void> {
    try {
      const docRef = db.collection('doctorAvailability').doc(`${doctorId}_${date}`);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        const slots = this.generateDefaultSlots(date);
        const updatedSlots = slots.map(slot => 
          slot.startTime === time 
            ? { ...slot, isAvailable, doctorId, bookingId }
            : { ...slot, doctorId }
        );
        await docRef.set({
          doctorId,
          date,
          slots: updatedSlots,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = docSnap.data() as DoctorAvailability;
      const updatedSlots = (data.slots || []).map(slot =>
        slot.startTime === time
          ? { ...slot, isAvailable, doctorId, bookingId }
          : slot
      );

      await docRef.update({
        slots: updatedSlots,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating slot availability:', error);
      throw error;
    }
  }

  // Create booking with transaction
  static async createBooking(bookingData: Omit<Booking, 'id' | 'status' | 'rescheduleCount' | 'maxReschedules' | 'rescheduleHistory' | 'createdAt' | 'updatedAt'>): Promise<{ bookingId: string; error: string | null }> {
    try {
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Use Firestore transaction to prevent double booking
      const result = await db.runTransaction(async (transaction) => {
        const availabilityRef = db.collection('doctorAvailability').doc(`${bookingData.doctorId}_${bookingData.appointmentDate}`);

        // Check if slot is already booked and read availability before any writes
        const [existingBookingsSnapshot, availabilitySnap] = await Promise.all([
          transaction.get(
            db.collection('bookings')
              .where('doctorId', '==', bookingData.doctorId)
              .where('appointmentDate', '==', bookingData.appointmentDate)
              .where('appointmentTime', '==', bookingData.appointmentTime)
              .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])
          ),
          transaction.get(availabilityRef),
        ]);

        if (!existingBookingsSnapshot.empty) {
          throw new Error('This slot is no longer available');
        }

        // Create the booking
        const now = new Date().toISOString();
        const booking: Booking = {
          id: bookingId,
          ...bookingData,
          status: 'pending',
          rescheduleCount: 0,
          maxReschedules: MAX_RESCHEDULES,
          rescheduleHistory: [],
          createdAt: now,
          updatedAt: now,
        };

        const bookingRef = db.collection('bookings').doc(bookingId);
        transaction.set(bookingRef, booking);

        if (availabilitySnap.exists) {
          const data = availabilitySnap.data() as DoctorAvailability;
          const updatedSlots = (data.slots || []).map(slot =>
            slot.startTime === bookingData.appointmentTime
              ? { ...slot, isAvailable: false, bookingId }
              : slot
          );
          transaction.update(availabilityRef, {
            slots: updatedSlots,
            updatedAt: now,
          });
        }

        return bookingId;
      });

      return { bookingId: result, error: null };
    } catch (error: any) {
      console.error('Error creating booking:', error);
      return { bookingId: '', error: error.message };
    }
  }

  // Get booking by ID
  static async getBooking(bookingId: string): Promise<Booking | null> {
    try {
      const docSnap = await db.collection('bookings').doc(bookingId).get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as Booking;
      }
      return null;
    } catch (error) {
      console.error('Error getting booking:', error);
      return null;
    }
  }

  // Get doctor bookings
  static async getDoctorBookings(doctorId: string, status?: string): Promise<Booking[]> {
    try {
      let query = db.collection('bookings')
        .where('doctorId', '==', doctorId)
        .orderBy('appointmentDate', 'desc');

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      const bookings: Booking[] = [];
      snapshot.forEach(doc => {
        bookings.push({ id: doc.id, ...doc.data() } as Booking);
      });
      return bookings;
    } catch (error) {
      console.error('Error getting doctor bookings:', error);
      return [];
    }
  }

  // Get patient bookings
  static async getPatientBookings(patientId: string): Promise<Booking[]> {
    try {
      const snapshot = await db.collection('bookings')
        .where('patientId', '==', patientId)
        .orderBy('appointmentDate', 'desc')
        .get();

      const bookings: Booking[] = [];
      snapshot.forEach(doc => {
        bookings.push({ id: doc.id, ...doc.data() } as Booking);
      });
      return bookings;
    } catch (error) {
      console.error('Error getting patient bookings:', error);
      return [];
    }
  }

  // Get upcoming bookings for a doctor
  static async getUpcomingBookings(doctorId: string): Promise<Booking[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const snapshot = await db.collection('bookings')
        .where('doctorId', '==', doctorId)
        .where('appointmentDate', '>=', today)
        .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])
        .orderBy('appointmentDate', 'asc')
        .orderBy('appointmentTime', 'asc')
        .limit(50)
        .get();

      const bookings: Booking[] = [];
      snapshot.forEach(doc => {
        bookings.push({ id: doc.id, ...doc.data() } as Booking);
      });
      return bookings;
    } catch (error) {
      console.error('Error getting upcoming bookings:', error);
      return [];
    }
  }

  // Get booking stats
  static async getBookingStats(doctorId: string): Promise<BookingStats> {
    try {
      const bookings = await this.getDoctorBookings(doctorId);
      
      return {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        revenue: bookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.consultationFee || 0), 0),
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      return { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 };
    }
  }

  // Reschedule booking
  static async rescheduleBooking(
    bookingId: string,
    newDate: string,
    newTime: string,
    reason?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const bookingRef = db.collection('bookings').doc(bookingId);

      const result = await db.runTransaction(async (transaction) => {
        const bookingSnap = await transaction.get(bookingRef);

        if (!bookingSnap.exists) {
          throw new Error('Booking not found');
        }

        const booking = bookingSnap.data() as Booking;
        const oldAvailabilityRef = db.collection('doctorAvailability').doc(`${booking.doctorId}_${booking.appointmentDate}`);
        const newAvailabilityRef = db.collection('doctorAvailability').doc(`${booking.doctorId}_${newDate}`);

        const [existingBookingsSnapshot, oldAvailabilitySnap, newAvailabilitySnap] = await Promise.all([
          transaction.get(
            db.collection('bookings')
              .where('doctorId', '==', booking.doctorId)
              .where('appointmentDate', '==', newDate)
              .where('appointmentTime', '==', newTime)
              .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])
          ),
          transaction.get(oldAvailabilityRef),
          transaction.get(newAvailabilityRef),
        ]);

        if (booking.rescheduleCount >= booking.maxReschedules) {
          transaction.update(bookingRef, {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancellationReason: 'Maximum reschedules exceeded',
            updatedAt: new Date().toISOString(),
          });

          const restoredOldSlots = oldAvailabilitySnap.exists
            ? (oldAvailabilitySnap.data() as DoctorAvailability).slots.map(slot =>
                slot.startTime === booking.appointmentTime
                  ? { ...slot, isAvailable: true, doctorId: booking.doctorId }
                  : { ...slot, doctorId: booking.doctorId }
              )
            : [{
                date: booking.appointmentDate,
                startTime: booking.appointmentTime,
                endTime: booking.appointmentTime,
                isAvailable: true,
                doctorId: booking.doctorId,
              }];

          if (oldAvailabilitySnap.exists) {
            transaction.update(oldAvailabilityRef, {
              slots: restoredOldSlots,
              updatedAt: new Date().toISOString(),
            });
          } else {
            transaction.set(oldAvailabilityRef, {
              doctorId: booking.doctorId,
              date: booking.appointmentDate,
              slots: restoredOldSlots,
              updatedAt: new Date().toISOString(),
            });
          }

          throw new Error('Booking cancelled - maximum reschedules exceeded');
        }

        if (!existingBookingsSnapshot.empty) {
          throw new Error('The new slot is not available');
        }

        // Add to reschedule history
        const historyEntry: RescheduleHistory = {
          fromDate: booking.appointmentDate,
          fromTime: booking.appointmentTime,
          toDate: newDate,
          toTime: newTime,
          rescheduledAt: new Date().toISOString(),
          reason,
        };

        const now = new Date().toISOString();

        const oldSlots = oldAvailabilitySnap.exists ? (oldAvailabilitySnap.data() as DoctorAvailability).slots || [] : [];
        const restoredOldSlots = oldSlots.map(slot =>
          slot.startTime === booking.appointmentTime
            ? { ...slot, isAvailable: true, doctorId: booking.doctorId }
            : { ...slot, doctorId: booking.doctorId }
        );

        const blockedNewSlots = newAvailabilitySnap.exists
          ? (newAvailabilitySnap.data() as DoctorAvailability).slots.map(slot =>
              slot.startTime === newTime
                ? { ...slot, isAvailable: false, doctorId: booking.doctorId, bookingId }
                : { ...slot, doctorId: booking.doctorId }
            )
          : [{
              date: newDate,
              startTime: newTime,
              endTime: newTime,
              isAvailable: false,
              doctorId: booking.doctorId,
              bookingId,
            }];

        transaction.update(bookingRef, {
          appointmentDate: newDate,
          appointmentTime: newTime,
          status: 'rescheduled',
          rescheduleCount: booking.rescheduleCount + 1,
          rescheduleHistory: [...(booking.rescheduleHistory || []), historyEntry],
          updatedAt: now,
        });

        if (oldAvailabilitySnap.exists) {
          transaction.update(oldAvailabilityRef, {
            slots: restoredOldSlots,
            updatedAt: now,
          });
        } else {
          transaction.set(oldAvailabilityRef, {
            doctorId: booking.doctorId,
            date: booking.appointmentDate,
            slots: restoredOldSlots,
            updatedAt: now,
          });
        }

        if (newAvailabilitySnap.exists) {
          transaction.update(newAvailabilityRef, {
            slots: blockedNewSlots,
            updatedAt: now,
          });
        } else {
          transaction.set(newAvailabilityRef, {
            doctorId: booking.doctorId,
            date: newDate,
            slots: blockedNewSlots,
            updatedAt: now,
          });
        }
      });

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error rescheduling booking:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel booking
  static async cancelBooking(bookingId: string, reason?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingSnap = await bookingRef.get();
      
      if (!bookingSnap.exists) {
        return { success: false, error: 'Booking not found' };
      }

      const booking = bookingSnap.data() as Booking;

      // Restore slot availability
      await this.updateSlotAvailability(
        booking.doctorId,
        booking.appointmentDate,
        booking.appointmentTime,
        true
      );

      // Update booking
      await bookingRef.update({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason || 'Cancelled by patient',
        updatedAt: new Date().toISOString(),
      });

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      return { success: false, error: error.message };
    }
  }

  // Update booking status
  static async updateBookingStatus(
    bookingId: string,
    status: Booking['status'],
    reason?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString(),
      };

      if (status === 'cancelled' && reason) {
        updateData.cancelledAt = new Date().toISOString();
        updateData.cancellationReason = reason;
      } else if (status === 'confirmed') {
        updateData.confirmedAt = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }

      await bookingRef.update(updateData);
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      return { success: false, error: error.message };
    }
  }

  // Set day availability
  static async setDayAvailability(doctorId: string, date: string, slots: BookingSlot[]): Promise<{ success: boolean; error: string | null }> {
    try {
      const availabilityRef = db.collection('doctorAvailability').doc(`${doctorId}_${date}`);
      
      // Get existing bookings to block booked slots
      const bookingsSnapshot = await db.collection('bookings')
        .where('doctorId', '==', doctorId)
        .where('appointmentDate', '==', date)
        .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])
        .get();

      const bookedTimes = new Set();
      bookingsSnapshot.forEach(doc => {
        const data = doc.data();
        bookedTimes.add(data.appointmentTime);
      });

      const updatedSlots = slots.map(slot => ({
        ...slot,
        isAvailable: slot.isAvailable && !bookedTimes.has(slot.startTime),
        doctorId,
      }));

      await availabilityRef.set({
        doctorId,
        date,
        slots: updatedSlots,
        updatedAt: new Date().toISOString(),
      });

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error setting day availability:', error);
      return { success: false, error: error.message };
    }
  }
}