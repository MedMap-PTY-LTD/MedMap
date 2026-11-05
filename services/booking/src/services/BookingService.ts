import { db } from '../config/firebase';
import { 
  Booking, 
  BookingSlot, 
  DoctorAvailability, 
  BookingStats,
  RescheduleHistory,
  BookingEvents,
} from '../types';
import { BOOKING_FEE, PaymentService, PayFastCheckout } from './PaymentService';
import { PATIENT_MEMBERSHIP_PLANS } from './PatientMembershipService';
import { hasPaidMembershipAccess } from './membershipAccess';
import { accountCreditRef, accountCreditTransactionRef } from './AccountCreditService';
import { BookingNotificationService } from './BookingNotificationService';

const MAX_RESCHEDULES = 2;
const DEFAULT_CONSULTATION_DURATION = 30;
const SLOT_INTERVAL = 30;
export const PAYMENT_HOLD_DURATION_MS = 10 * 60 * 1000;
const ACTIVE_BOOKING_STATUSES: Booking['status'][] = ['pending', 'unconfirmed', 'confirmed', 'rescheduled', 'live'];

function timeInMinutes(value: string | undefined): number {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return Number.NaN;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeInMinutes(startA);
  const aEnd = timeInMinutes(endA);
  const bStart = timeInMinutes(startB);
  const bEnd = timeInMinutes(endB);
  return Number.isFinite(aStart) && Number.isFinite(aEnd) && Number.isFinite(bStart) &&
    Number.isFinite(bEnd) && aStart < bEnd && bStart < aEnd;
}

function bookingEndTime(startTime: string, endTime?: string): string {
  const start = timeInMinutes(startTime);
  const end = timeInMinutes(endTime);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) return endTime!;
  const fallbackEnd = start + DEFAULT_CONSULTATION_DURATION;
  return Number.isFinite(fallbackEnd)
    ? `${String(Math.floor(fallbackEnd / 60)).padStart(2, '0')}:${String(fallbackEnd % 60).padStart(2, '0')}`
    : startTime;
}

function paymentSessionExpiry(booking: Booking): number {
  const explicitExpiry = Date.parse(String(booking.paymentExpiresAt || ''));
  if (Number.isFinite(explicitExpiry)) return explicitExpiry;
  const createdAt = typeof booking.createdAt === 'string'
    ? Date.parse(booking.createdAt)
    : booking.createdAt?.toDate?.().getTime?.();
  return Number.isFinite(createdAt) ? createdAt + PAYMENT_HOLD_DURATION_MS : Number.NaN;
}

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
        .where('status', 'in', ACTIVE_BOOKING_STATUSES)
        .get();

      const bookedBookings: Booking[] = [];
      bookingsSnapshot.forEach(doc => {
        bookedBookings.push({ id: doc.id, ...doc.data() } as Booking);
      });

      return slots.map(slot => ({
        ...slot,
        isAvailable: slot.isAvailable && !bookedBookings.some(booking => intervalsOverlap(
          slot.startTime,
          slot.endTime,
          booking.appointmentTime,
          bookingEndTime(booking.appointmentTime, booking.endTime),
        )),
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
      await db.runTransaction(async transaction => {
        const [availabilitySnap, activeBookings] = await Promise.all([
          transaction.get(docRef),
          transaction.get(db.collection('bookings')
            .where('doctorId', '==', doctorId)
            .where('appointmentDate', '==', date)
            .where('status', 'in', ACTIVE_BOOKING_STATUSES)),
        ]);
        const slots = availabilitySnap.exists
          ? (availabilitySnap.data() as DoctorAvailability).slots || []
          : this.generateDefaultSlots(date);
        const target = slots.find(slot => slot.startTime === time);
        if (!target) throw new Error('Availability slot not found');
        const conflictingBooking = activeBookings.docs.find(document => {
          const booking = document.data() as Booking;
          return intervalsOverlap(time, target.endTime, booking.appointmentTime, bookingEndTime(booking.appointmentTime, booking.endTime));
        });
        if (isAvailable && conflictingBooking) {
          throw new Error('A booking already holds this time; it cannot be reopened yet');
        }
        const updatedSlots = slots.map(slot => {
          if (slot.startTime !== time) return { ...slot, doctorId };
          const next = { ...slot, isAvailable, doctorId };
          if (isAvailable) delete next.bookingId;
          else if (bookingId || conflictingBooking) next.bookingId = bookingId || conflictingBooking!.id;
          return next;
        });
        transaction.set(docRef, { doctorId, date, slots: updatedSlots, updatedAt: new Date().toISOString() });
      });
    } catch (error) {
      console.error('Error updating slot availability:', error);
      throw error;
    }
  }

  // Create booking with transaction
  static async createBooking(
    bookingData: Omit<Booking, 'id' | 'status' | 'rescheduleCount' | 'maxReschedules' | 'rescheduleHistory' | 'createdAt' | 'updatedAt' | 'paymentStatus' | 'paymentId' | 'paymentReference'>
  ): Promise<{ bookingId: string; bookingFee: number; bookingFeeCredit: number; bookingFeeTotal: number; membershipPlanId: string; freeBookingsRemaining: number; error: string | null }> {
    try {
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const creditRef = accountCreditRef(bookingData.patientId);
      const debitLedgerRef = accountCreditTransactionRef(bookingData.patientId, `booking_${bookingId}_debit`);
      
      const result = await db.runTransaction(async (transaction) => {
        const availabilityRef = db.collection('doctorAvailability').doc(`${bookingData.doctorId}_${bookingData.appointmentDate}`);
        const membershipRef = db.collection('patientMemberships').doc(bookingData.patientId);

        const [existingBookingsSnapshot, availabilitySnap, membershipSnap, creditSnap, debitLedgerSnap] = await Promise.all([
          transaction.get(
            db.collection('bookings')
              .where('doctorId', '==', bookingData.doctorId)
              .where('appointmentDate', '==', bookingData.appointmentDate)
              .where('status', 'in', ACTIVE_BOOKING_STATUSES)
          ),
          transaction.get(availabilityRef),
          transaction.get(membershipRef),
          transaction.get(creditRef),
          transaction.get(debitLedgerRef),
        ]);

        const requestedEndTime = bookingData.endTime || bookingData.appointmentTime;
        const overlapsExistingBooking = existingBookingsSnapshot.docs.some(document => {
          const existing = document.data() as Booking;
          return intervalsOverlap(
            bookingData.appointmentTime,
            requestedEndTime,
            existing.appointmentTime,
            bookingEndTime(existing.appointmentTime, existing.endTime),
          );
        });
        if (overlapsExistingBooking) {
          throw new Error('This slot is no longer available');
        }
        const slots = availabilitySnap.exists
          ? (availabilitySnap.data() as DoctorAvailability).slots
          : this.generateDefaultSlots(bookingData.appointmentDate);
        const selected = slots.find(slot => slot.startTime === bookingData.appointmentTime);
        if (!selected || !selected.isAvailable) {
          throw new Error('This slot is not available');
        }

        const now = new Date().toISOString();
        const membership = membershipSnap.exists ? membershipSnap.data()! : undefined;
        const membershipCurrent = !!membership && membership.audience === 'patient' && hasPaidMembershipAccess(membership);
        let membershipPlanId = 'free';
        let membershipFreeBooking = false;
        let membershipFreeBookingPeriodStart: string | null = null;
        let bookingFee = BOOKING_FEE;
        let freeBookingsRemaining = 0;

        if (membershipCurrent && membership?.audience === 'patient' && membership.planId === 'premium_plus') {
          membershipPlanId = 'premium_plus';
          membershipFreeBookingPeriodStart = membership.currentPeriodStart || null;
          bookingFee = 0;
        } else if (membershipCurrent && membership?.audience === 'patient' && membership.planId === 'basic_premium') {
          membershipPlanId = 'basic_premium';
          membershipFreeBookingPeriodStart = membership.currentPeriodStart || null;
          const limit = PATIENT_MEMBERSHIP_PLANS.basic_premium.freeCompletedBookings;
          const completed = Math.max(0, Number(membership.completedFreeBookings) || 0);
          const reserved = Math.max(0, Number(membership.reservedFreeBookings) || 0);
          freeBookingsRemaining = Math.max(0, limit - completed - reserved);
          membershipFreeBooking = freeBookingsRemaining > 0;
          bookingFee = membershipFreeBooking ? 0 : 8;
          if (membershipFreeBooking) {
            transaction.update(membershipRef, { reservedFreeBookings: reserved + 1, updatedAt: now });
            freeBookingsRemaining = Math.max(0, freeBookingsRemaining - 1);
          }
        }

        const assessedFeeCents = Math.max(0, Math.round(bookingFee * 100));
        const availableCreditCents = bookingData.paymentEnvironment === 'live'
          ? Math.max(0, Math.floor(Number(creditSnap.data()?.balanceCents) || 0))
          : 0;
        const creditAppliedCents = availableCreditCents >= assessedFeeCents
          ? assessedFeeCents
          : Math.min(availableCreditCents, Math.max(0, assessedFeeCents - 500));
        const payableFeeCents = assessedFeeCents - creditAppliedCents;
        const feeCoveredAtBooking = payableFeeCents === 0;
        if (creditAppliedCents > 0) {
          if (debitLedgerSnap.exists) throw new Error('Account credit was already applied to this booking');
          const creditNow = new Date().toISOString();
          transaction.set(creditRef, {
            userId: bookingData.patientId,
            currency: 'ZAR',
            balanceCents: availableCreditCents - creditAppliedCents,
            updatedAt: creditNow,
          }, { merge: true });
          transaction.create(debitLedgerRef, {
            userId: bookingData.patientId,
            amountCents: -creditAppliedCents,
            balanceAfterCents: availableCreditCents - creditAppliedCents,
            kind: 'booking_fee_debit',
            reason: 'Account credit applied to booking fee',
            source: 'Booking fee',
            bookingId,
            createdAt: creditNow,
          });
        }

        const booking: Booking = {
          id: bookingId,
          ...bookingData,
          bookingFee: payableFeeCents / 100,
          bookingFeeTotal: assessedFeeCents / 100,
          bookingFeeCreditCents: creditAppliedCents,
          membershipPlanId,
          membershipFreeBooking,
          membershipFreeBookingPeriodStart,
          // Commit a fully covered booking as confirmed in the same
          // transaction as the credit debit. This avoids leaving an unpaid
          // booking behind if a follow-up update fails after consuming credit.
          status: feeCoveredAtBooking ? 'confirmed' : 'pending',
          paymentStatus: feeCoveredAtBooking ? 'waived' : 'unpaid',
          ...(!feeCoveredAtBooking ? { paymentExpiresAt: new Date(Date.parse(now) + PAYMENT_HOLD_DURATION_MS).toISOString() } : {}),
          ...(feeCoveredAtBooking ? { paidAt: now, confirmedAt: now } : {}),
          rescheduleCount: 0,
          maxReschedules: MAX_RESCHEDULES,
          rescheduleHistory: [],
          ...(feeCoveredAtBooking && creditAppliedCents > 0 ? { paymentMethod: 'account_credit' as const } : {}),
          ...(feeCoveredAtBooking && creditAppliedCents === 0 ? { paymentMethod: 'membership' as const } : {}),
          ...(creditAppliedCents > 0 && payableFeeCents > 0 ? { paymentMethod: 'mixed' as const } : {}),
          createdAt: now,
          updatedAt: now,
        };

        const bookingRef = db.collection('bookings').doc(bookingId);
        transaction.set(bookingRef, booking);

        {
          const data = availabilitySnap.exists ? availabilitySnap.data() as DoctorAvailability : null;
          const baseSlots = data?.slots || this.generateDefaultSlots(bookingData.appointmentDate);
          const updatedSlots = baseSlots.map(slot =>
            slot.startTime === bookingData.appointmentTime
              ? { ...slot, isAvailable: false, doctorId: bookingData.doctorId, bookingId }
              : { ...slot, doctorId: bookingData.doctorId }
          );
          transaction.set(availabilityRef, {
            doctorId: bookingData.doctorId,
            date: bookingData.appointmentDate,
            slots: updatedSlots,
            updatedAt: now,
          }, { merge: true });
        }

        return {
          bookingId,
          bookingFee: payableFeeCents / 100,
          bookingFeeCredit: creditAppliedCents / 100,
          bookingFeeTotal: assessedFeeCents / 100,
          membershipPlanId,
          freeBookingsRemaining,
        };
      });

      return { ...result, error: null };
    } catch (error: any) {
      console.error('Error creating booking:', error);
      return { bookingId: '', bookingFee: 0, bookingFeeCredit: 0, bookingFeeTotal: 0, membershipPlanId: 'free', freeBookingsRemaining: 0, error: error.message };
    }
  }

  // 🔥 Create booking + PayFast payment form together
  static async createBookingWithPayment(
    bookingData: Omit<Booking, 'id' | 'status' | 'rescheduleCount' | 'maxReschedules' | 'rescheduleHistory' | 'createdAt' | 'updatedAt' | 'paymentStatus' | 'paymentId' | 'paymentReference'>,
    paymentMethod: string = 'card'
  ): Promise<{ bookingId: string; checkout?: PayFastCheckout; bookingFee: number; bookingFeeCredit?: number; bookingFeeTotal?: number; membershipPlanId?: string; freeBookingsRemaining?: number; paymentExpiresAt?: string; error: string | null }> {
    try {
      PaymentService.ensureConfigured();
    } catch (err: any) {
      return { bookingId: '', bookingFee: 0, bookingFeeCredit: 0, bookingFeeTotal: 0, error: err.message };
    }
    const paymentEnvironment = PaymentService.currentMode();
    const created = await this.createBooking({
      ...bookingData,
      paymentEnvironment,
      isTestBooking: paymentEnvironment === 'sandbox',
    });
    const { bookingId, error, bookingFee } = created;
    if (error || !bookingId) {
      return { bookingId: '', bookingFee: 0, error };
    }

    if (bookingFee === 0) {
      // No balance is due. The booking was already confirmed atomically with
      // its account-credit debit or membership coverage above.
      await BookingNotificationService.notify({
        userId: bookingData.doctorId,
        room: 'doctor',
        id: `booking_${bookingId}_created`,
        type: 'booking_created',
        title: 'New booking confirmed',
        message: `${bookingData.patientName} booked ${bookingData.appointmentDate} at ${bookingData.appointmentTime}. The appointment is confirmed.`,
        bookingId,
        actionUrl: '/doctor',
        eventPayload: {
          patientId: bookingData.patientId,
          appointmentDate: bookingData.appointmentDate,
          appointmentTime: bookingData.appointmentTime,
        },
      });
      return { bookingId, bookingFee, bookingFeeCredit: created.bookingFeeCredit, bookingFeeTotal: created.bookingFeeTotal, membershipPlanId: created.membershipPlanId, freeBookingsRemaining: created.freeBookingsRemaining, error: null };
    }

    try {
      const checkout = await PaymentService.createPaymentIntent(bookingId);
      const booking = await this.getBooking(bookingId);
      return { bookingId, checkout, bookingFee, bookingFeeCredit: created.bookingFeeCredit, bookingFeeTotal: created.bookingFeeTotal, membershipPlanId: created.membershipPlanId, freeBookingsRemaining: created.freeBookingsRemaining, paymentExpiresAt: booking?.paymentExpiresAt, error: null };
    } catch (err: any) {
      // Keep the booking so the patient can retry payment or cancel it.
      return { bookingId, bookingFee, bookingFeeCredit: created.bookingFeeCredit, bookingFeeTotal: created.bookingFeeTotal, membershipPlanId: created.membershipPlanId, freeBookingsRemaining: created.freeBookingsRemaining, error: err.message };
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
        .where('status', 'in', ['confirmed', 'rescheduled', 'live'])
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
        totalPatients: new Set(bookings.map(booking => booking.patientId).filter(Boolean)).size,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        revenue: bookings
          .filter(b => b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.consultationFee || 0), 0),
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      return { total: 0, totalPatients: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 };
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

      await db.runTransaction(async (transaction) => {
        const bookingSnap = await transaction.get(bookingRef);

        if (!bookingSnap.exists) {
          throw new Error('Booking not found');
        }

        const booking = bookingSnap.data() as Booking;
        if (!['pending', 'confirmed', 'rescheduled'].includes(booking.status)) {
          throw new Error('This booking cannot be rescheduled');
        }
        const oldAvailabilityRef = db.collection('doctorAvailability').doc(`${booking.doctorId}_${booking.appointmentDate}`);
        const newAvailabilityRef = db.collection('doctorAvailability').doc(`${booking.doctorId}_${newDate}`);

        const [existingBookingsSnapshot, oldAvailabilitySnap, newAvailabilitySnap] = await Promise.all([
          transaction.get(
            db.collection('bookings')
              .where('doctorId', '==', booking.doctorId)
              .where('appointmentDate', '==', newDate)
              .where('status', 'in', ACTIVE_BOOKING_STATUSES)
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

          const oldSlots = oldAvailabilitySnap.exists
            ? (oldAvailabilitySnap.data() as DoctorAvailability).slots || []
            : this.generateDefaultSlots(booking.appointmentDate);
          const restoredOldSlots = oldSlots.map(slot =>
            slot.startTime === booking.appointmentTime
              ? { ...slot, isAvailable: true, doctorId: booking.doctorId }
              : { ...slot, doctorId: booking.doctorId }
          );

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

        const oldStartMinutes = timeInMinutes(booking.appointmentTime);
        const oldEndMinutes = timeInMinutes(bookingEndTime(booking.appointmentTime, booking.endTime));
        const durationMinutes = Math.max(1, oldEndMinutes - oldStartMinutes);
        const newStartMinutes = timeInMinutes(newTime);
        const newEndMinutes = newStartMinutes + durationMinutes;
        const newEndTime = Number.isFinite(newEndMinutes)
          ? `${String(Math.floor(newEndMinutes / 60)).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`
          : '';
        const overlapsExistingBooking = existingBookingsSnapshot.docs.some(document => {
          if (document.id === bookingId) return false;
          const existing = document.data() as Booking;
          return intervalsOverlap(newTime, newEndTime, existing.appointmentTime, bookingEndTime(existing.appointmentTime, existing.endTime));
        });
        if (overlapsExistingBooking) {
          throw new Error('The new slot is not available');
        }

        const configuredNewSlots = newAvailabilitySnap.exists
          ? (newAvailabilitySnap.data() as DoctorAvailability).slots || []
          : this.generateDefaultSlots(newDate);
        const selectedNewSlot = configuredNewSlots.find(slot => slot.startTime === newTime);
        if (!selectedNewSlot || (!selectedNewSlot.isAvailable && !(newDate === booking.appointmentDate && newTime === booking.appointmentTime))) {
          throw new Error('The new slot is not available');
        }

        const historyEntry: RescheduleHistory = {
          fromDate: booking.appointmentDate,
          fromTime: booking.appointmentTime,
          toDate: newDate,
          toTime: newTime,
          rescheduledAt: new Date().toISOString(),
          reason: reason || '',
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
          : this.generateDefaultSlots(newDate).map(slot => slot.startTime === newTime
            ? { ...slot, isAvailable: false, doctorId: booking.doctorId, bookingId }
            : { ...slot, doctorId: booking.doctorId });

        transaction.update(bookingRef, {
          appointmentDate: newDate,
          appointmentTime: newTime,
          endTime: newEndTime,
          status: ['paid', 'waived'].includes(booking.paymentStatus) ? 'rescheduled' : 'pending',
          rescheduleCount: booking.rescheduleCount + 1,
          rescheduleHistory: [...(booking.rescheduleHistory || []), historyEntry],
          updatedAt: now,
        });

        if (oldAvailabilityRef.path === newAvailabilityRef.path) {
          const movedSlots = restoredOldSlots.map(slot => slot.startTime === newTime
            ? { ...slot, isAvailable: false, doctorId: booking.doctorId, bookingId }
            : slot);
          transaction.set(newAvailabilityRef, {
            doctorId: booking.doctorId,
            date: newDate,
            slots: movedSlots,
            updatedAt: now,
          });
        } else {
          transaction.set(oldAvailabilityRef, {
            doctorId: booking.doctorId,
            date: booking.appointmentDate,
            slots: restoredOldSlots,
            updatedAt: now,
          });
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

  // Patient cancellations receive no credit. When a doctor cancels a live paid
  // booking, the patient receives the agreed R10 account credit.
  static async cancelBooking(
    bookingId: string,
    reason?: string,
    actor: 'patient' | 'doctor' | 'admin' = 'patient',
  ): Promise<{ success: boolean; error: string | null; doctorCreditCents?: number; reservedCreditReturnCents?: number }> {
    try {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const cancellation = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(bookingRef);
        if (!snapshot.exists) throw new Error('Booking not found');
        const booking = snapshot.data() as Booking;
        if (booking.status === 'cancelled') throw new Error('Booking is already cancelled');
        if (booking.status === 'completed') throw new Error('Completed bookings cannot be cancelled');
        const availabilityRef = db.collection('doctorAvailability').doc(booking.doctorId + '_' + booking.appointmentDate);
        const paymentRef = booking.paymentId ? db.collection('payments').doc(booking.paymentId) : null;
        const feeValueCents = booking.bookingFeeTotal != null
          ? Math.max(0, Math.round(Number(booking.bookingFeeTotal) * 100))
          : Math.max(0, Math.round(Number(booking.bookingFee || 0) * 100)) + Math.max(0, Math.floor(Number(booking.bookingFeeCreditCents) || 0));
        const feeWasSettled = booking.paymentStatus === 'paid' ||
          (booking.paymentStatus === 'waived' && booking.paymentMethod === 'account_credit');
        const doctorCreditCents = actor === 'doctor' && !['pending', 'unconfirmed'].includes(booking.status) &&
          feeWasSettled && feeValueCents > 0 &&
          booking.paymentEnvironment === 'live' && booking.isTestBooking !== true ? 1000 : 0;
        const reservedCreditReturnCents = ['unpaid', 'pending', 'failed'].includes(booking.paymentStatus)
          ? Math.max(0, Math.floor(Number(booking.bookingFeeCreditCents) || 0))
          : 0;
        const creditRef = doctorCreditCents > 0 || reservedCreditReturnCents > 0
          ? accountCreditRef(booking.patientId) : null;
        const creditLedgerRef = doctorCreditCents > 0
          ? accountCreditTransactionRef(booking.patientId, `doctor_cancel_${bookingId}`)
          : null;
        const reservedCreditReturnRef = reservedCreditReturnCents > 0
          ? accountCreditTransactionRef(booking.patientId, `booking_${bookingId}_cancel_return`)
          : null;
        const membershipRef = booking.membershipFreeBooking === true && !booking.membershipFreeBookingCountedAt &&
          !booking.membershipFreeBookingReleasedAt
          ? db.collection('patientMemberships').doc(booking.patientId)
          : null;
        const [availability, payment, membershipSnap, creditSnap, creditLedgerSnap, reservedReturnSnap] = await Promise.all([
          transaction.get(availabilityRef),
          paymentRef ? transaction.get(paymentRef) : Promise.resolve(null),
          membershipRef ? transaction.get(membershipRef) : Promise.resolve(null),
          creditRef ? transaction.get(creditRef) : Promise.resolve(null),
          creditLedgerRef ? transaction.get(creditLedgerRef) : Promise.resolve(null),
          reservedCreditReturnRef ? transaction.get(reservedCreditReturnRef) : Promise.resolve(null),
        ]);
        const now = new Date().toISOString();
        let creditBalanceCents = Math.max(0, Math.floor(Number(creditSnap?.data()?.balanceCents) || 0));
        if (doctorCreditCents > 0 && creditLedgerSnap?.exists) {
          throw new Error('Doctor cancellation credit was already issued for this booking');
        }
        if (reservedCreditReturnCents > 0 && reservedReturnSnap?.exists) {
          throw new Error('Reserved booking credit was already returned');
        }

        if (availability.exists) {
          const slots = (availability.data() as DoctorAvailability).slots.map(slot => {
            if (slot.startTime !== booking.appointmentTime || slot.bookingId !== bookingId) return slot;
            const restored = { ...slot };
            delete restored.bookingId;
            return { ...restored, isAvailable: true };
          });
          transaction.update(availabilityRef, { slots, updatedAt: now });
        }
        if (reservedCreditReturnCents > 0 && creditRef && reservedCreditReturnRef) {
          creditBalanceCents += reservedCreditReturnCents;
          transaction.create(reservedCreditReturnRef, {
            userId: booking.patientId,
            amountCents: reservedCreditReturnCents,
            balanceAfterCents: creditBalanceCents,
            kind: 'booking_fee_return',
            reason: 'Unpaid booking was cancelled before checkout; reserved account credit returned',
            source: `Cancelled unpaid booking ${bookingId}`,
            bookingId,
            createdAt: now,
          });
        }
        if (doctorCreditCents > 0 && creditRef && creditLedgerRef) {
          creditBalanceCents += doctorCreditCents;
          transaction.create(creditLedgerRef, {
            userId: booking.patientId,
            amountCents: doctorCreditCents,
            balanceAfterCents: creditBalanceCents,
            kind: 'booking_fee_return',
            reason: 'Doctor cancelled a confirmed booking; R10 credited for a future booking',
            source: `Doctor cancellation ${bookingId}`,
            bookingId,
            createdAt: now,
          });
        }
        if (creditRef && (reservedCreditReturnCents > 0 || doctorCreditCents > 0)) {
          transaction.set(creditRef, {
            userId: booking.patientId,
            currency: 'ZAR',
            balanceCents: creditBalanceCents,
            updatedAt: now,
          }, { merge: true });
        }
        if (membershipRef && membershipSnap?.exists &&
            membershipSnap.data()?.currentPeriodStart === booking.membershipFreeBookingPeriodStart) {
          const reserved = Math.max(0, Number(membershipSnap.data()?.reservedFreeBookings) || 0);
          transaction.update(membershipRef, { reservedFreeBookings: Math.max(0, reserved - 1), updatedAt: now });
        }
        transaction.update(bookingRef, {
          status: 'cancelled', cancelledAt: now,
          cancellationReason: reason || (actor === 'doctor' ? 'Cancelled by doctor' : actor === 'admin' ? 'Cancelled by platform admin' : 'Cancelled by patient'),
          cancellationActor: actor,
          ...(membershipRef ? { membershipFreeBookingReleasedAt: now } : {}),
          ...(doctorCreditCents > 0 ? { paymentStatus: 'credited', refundCreditStatus: 'credited', refundCreditAmountCents: doctorCreditCents, refundCreditAt: now } : {}),
          ...(booking.paymentStatus === 'pending' || booking.paymentStatus === 'unpaid' ? { paymentStatus: 'failed' } : {}),
          updatedAt: now,
        });
        if (paymentRef && ['pending', 'failed'].includes(String(payment?.data()?.status))) {
          transaction.update(paymentRef, { status: 'cancelled', updatedAt: now });
        } else if (paymentRef && doctorCreditCents > 0) {
          transaction.update(paymentRef, { status: 'credited', updatedAt: now });
        }
        return {
          patientId: booking.patientId,
          doctorId: booking.doctorId,
          appointmentDate: booking.appointmentDate,
          appointmentTime: booking.appointmentTime,
          patientName: booking.patientName,
          doctorName: booking.doctorName,
          doctorCreditCents,
          reservedCreditReturnCents,
        };
      });
      const patientShouldBeNotified = actor !== 'patient';
      const cancellationTitle = actor === 'doctor'
        ? 'Your appointment was cancelled'
        : actor === 'admin' ? 'Your appointment was cancelled by the platform' : 'A patient cancelled a booking';
      const cancellationMessage = actor === 'doctor'
        ? (cancellation.doctorCreditCents > 0
          ? `${cancellation.doctorName} cannot honor your appointment. R10 has been added to your account credit for a future booking.`
          : `${cancellation.doctorName} cannot honor your appointment. Please choose another available time.`)
        : actor === 'admin'
          ? 'The platform cancelled this appointment. Please contact support if you need help.'
          : `${cancellation.patientName} cancelled the appointment on ${cancellation.appointmentDate} at ${cancellation.appointmentTime}.`;
      const cancellationPayload = {
        reason: reason || (actor === 'doctor' ? 'Cancelled by doctor' : actor === 'admin' ? 'Cancelled by platform admin' : 'Cancelled by patient'),
        cancelledBy: actor,
        creditAmountCents: cancellation.doctorCreditCents,
      };
      await BookingNotificationService.notify({
        userId: patientShouldBeNotified ? cancellation.patientId : cancellation.doctorId,
        room: patientShouldBeNotified ? 'patient' : 'doctor',
        id: `booking_${bookingId}_cancelled_${actor}`,
        type: 'booking_cancelled',
        title: cancellationTitle,
        message: cancellationMessage,
        bookingId,
        eventPayload: cancellationPayload,
      });
      if (actor === 'patient' && cancellation.reservedCreditReturnCents > 0) {
        await BookingNotificationService.notify({
          userId: cancellation.patientId,
          room: 'patient',
          id: `booking_${bookingId}_unused_credit_returned`,
          type: 'booking_cancelled',
          title: 'Unused booking credit returned',
          message: `R${(cancellation.reservedCreditReturnCents / 100).toFixed(2)} of account credit was returned because you cancelled before completing payment.`,
          bookingId,
        });
      }
      BookingNotificationService.emitToUser('doctor', cancellation.doctorId, BookingEvents.BOOKING_CANCELLED, {
        bookingId,
        ...cancellationPayload,
      });
      BookingNotificationService.emitToUser('patient', cancellation.patientId, BookingEvents.BOOKING_CANCELLED, {
        bookingId,
        ...cancellationPayload,
      });
      BookingNotificationService.emitToUser('doctor', cancellation.doctorId, BookingEvents.AVAILABILITY_UPDATED, {
        doctorId: cancellation.doctorId,
        date: cancellation.appointmentDate,
        time: cancellation.appointmentTime,
        isAvailable: true,
      });
      return {
        success: true,
        error: null,
        doctorCreditCents: cancellation.doctorCreditCents,
        reservedCreditReturnCents: cancellation.reservedCreditReturnCents,
      };
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      return { success: false, error: error.message };
    }
  }

  /** Expire unpaid slot holds and return any account credit reserved by them. */
  static async expirePendingPaymentSessions(nowMs = Date.now()): Promise<number> {
    const pending = await db.collection('bookings').where('status', '==', 'pending').get();
    let expiredCount = 0;

    for (const document of pending.docs) {
      const initial = document.data() as Booking;
      const expiresAt = paymentSessionExpiry(initial);
      if (!Number.isFinite(expiresAt) || expiresAt > nowMs) continue;

      const bookingRef = document.ref;
      const expiration = await db.runTransaction(async transaction => {
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists) return null;
        const booking = bookingSnap.data() as Booking;
        const currentExpiry = paymentSessionExpiry(booking);
        if (booking.status !== 'pending' || !Number.isFinite(currentExpiry) || currentExpiry > nowMs ||
            ['paid', 'waived', 'credited', 'refunded'].includes(booking.paymentStatus)) return null;

        const availabilityRef = db.collection('doctorAvailability').doc(`${booking.doctorId}_${booking.appointmentDate}`);
        const paymentRef = booking.paymentId ? db.collection('payments').doc(booking.paymentId) : null;
        const membershipRef = booking.membershipFreeBooking === true && !booking.membershipFreeBookingCountedAt &&
          !booking.membershipFreeBookingReleasedAt
          ? db.collection('patientMemberships').doc(booking.patientId)
          : null;
        const accountRef = Math.max(0, Number(booking.bookingFeeCreditCents) || 0) > 0
          ? accountCreditRef(booking.patientId) : null;
        const debitLedgerRef = accountRef ? accountCreditTransactionRef(booking.patientId, `booking_${booking.id}_debit`) : null;
        const returnLedgerRef = accountRef ? accountCreditTransactionRef(booking.patientId, `booking_${booking.id}_expiry_return`) : null;
        const [availabilitySnap, paymentSnap, membershipSnap, accountSnap, debitLedgerSnap, returnLedgerSnap] = await Promise.all([
          transaction.get(availabilityRef),
          paymentRef ? transaction.get(paymentRef) : Promise.resolve(null),
          membershipRef ? transaction.get(membershipRef) : Promise.resolve(null),
          accountRef ? transaction.get(accountRef) : Promise.resolve(null),
          debitLedgerRef ? transaction.get(debitLedgerRef) : Promise.resolve(null),
          returnLedgerRef ? transaction.get(returnLedgerRef) : Promise.resolve(null),
        ]);
        const now = new Date(nowMs).toISOString();

        const baseSlots = availabilitySnap.exists
          ? (availabilitySnap.data() as DoctorAvailability).slots || []
          : this.generateDefaultSlots(booking.appointmentDate);
        let restoredSlot = false;
        const restoredSlots = baseSlots.map(slot => {
          if (slot.startTime !== booking.appointmentTime ||
              (availabilitySnap.exists && slot.bookingId !== booking.id)) return slot;
          const rest = { ...slot };
          delete rest.bookingId;
          restoredSlot = true;
          return { ...rest, isAvailable: true, doctorId: booking.doctorId };
        });
        if (!restoredSlot && !availabilitySnap.exists) {
          const defaultSlot = this.generateDefaultSlots(booking.appointmentDate)
            .find(slot => slot.startTime === booking.appointmentTime);
          if (defaultSlot) restoredSlots.push({ ...defaultSlot, isAvailable: true, doctorId: booking.doctorId });
        }

        transaction.set(availabilityRef, {
          doctorId: booking.doctorId,
          date: booking.appointmentDate,
          slots: restoredSlots,
          updatedAt: now,
        }, { merge: true });

        const reservedCreditCents = Math.max(0, Math.floor(Number(booking.bookingFeeCreditCents) || 0));
        if (accountRef && debitLedgerSnap?.exists && !returnLedgerSnap?.exists && reservedCreditCents > 0) {
          const nextBalance = Math.max(0, Math.floor(Number(accountSnap?.data()?.balanceCents) || 0)) + reservedCreditCents;
          transaction.set(accountRef, { userId: booking.patientId, currency: 'ZAR', balanceCents: nextBalance, updatedAt: now }, { merge: true });
          transaction.create(returnLedgerRef!, {
            userId: booking.patientId,
            amountCents: reservedCreditCents,
            balanceAfterCents: nextBalance,
            kind: 'booking_fee_return',
            reason: 'Booking payment session expired; account credit was returned',
            source: `Expired booking ${booking.id}`,
            bookingId: booking.id,
            createdAt: now,
          });
        }
        if (membershipRef && membershipSnap?.exists &&
            membershipSnap.data()?.currentPeriodStart === booking.membershipFreeBookingPeriodStart) {
          const reserved = Math.max(0, Number(membershipSnap.data()?.reservedFreeBookings) || 0);
          transaction.update(membershipRef, { reservedFreeBookings: Math.max(0, reserved - 1), updatedAt: now });
        }
        transaction.update(bookingRef, {
          status: 'cancelled',
          paymentStatus: 'expired',
          cancellationActor: 'system',
          cancellationReason: 'Payment session expired; slot released',
          cancelledAt: now,
          paymentExpiredAt: now,
          ...(membershipRef ? { membershipFreeBookingReleasedAt: now } : {}),
          updatedAt: now,
        });
        if (paymentRef && paymentSnap?.exists && ['pending', 'failed'].includes(String(paymentSnap.data()?.status))) {
          transaction.update(paymentRef, { status: 'expired', updatedAt: now });
        }
        return {
          bookingId: booking.id,
          doctorId: booking.doctorId,
          patientId: booking.patientId,
          appointmentDate: booking.appointmentDate,
          appointmentTime: booking.appointmentTime,
          latePaymentCredited: !!booking.latePaymentCreditedAt,
        };
      });

      if (!expiration) continue;
      expiredCount += 1;
      if (!expiration.latePaymentCredited) await BookingNotificationService.notify({
        userId: expiration.patientId,
        room: 'patient',
        id: `booking_${expiration.bookingId}_payment_expired`,
        type: 'booking_payment_expired',
        title: 'Booking session expired',
        message: 'The 10-minute payment window ended before payment was completed. The slot has been released; please select a time again.',
        bookingId: expiration.bookingId,
      });
      BookingNotificationService.emitToUser('patient', expiration.patientId, BookingEvents.BOOKING_UPDATED, {
        bookingId: expiration.bookingId,
        status: 'cancelled',
        reason: 'Payment session expired',
      });
      BookingNotificationService.emitToUser('doctor', expiration.doctorId, BookingEvents.AVAILABILITY_UPDATED, {
        doctorId: expiration.doctorId,
        date: expiration.appointmentDate,
        time: expiration.appointmentTime,
        isAvailable: true,
      });
    }

    return expiredCount;
  }


  // 🔥 NEW: Admin marks a refund as processed (after doing it in PayFast dashboard)
  static async markRefundProcessed(
    bookingId: string,
    refundReference?: string
  ): Promise<{ success: boolean; error: string | null; patientId?: string; doctorId?: string; bookingCancelled?: boolean }> {
    try {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const result = await db.runTransaction(async transaction => {
        const [bookingSnap, queueSnapshot] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(db.collection('refundQueue')
            .where('bookingId', '==', bookingId)
            .where('status', '==', 'pending_manual_refund')),
        ]);
        if (!bookingSnap.exists) throw new Error('Booking not found');

        const booking = bookingSnap.data() as Booking;
        const cancellationReview = booking.paymentStatus === 'refund_pending' || queueSnapshot.docs.some(
          document => document.data().reviewType === 'booking_cancellation',
        );
        const canCancel = ['pending', 'unconfirmed', 'live', 'confirmed', 'rescheduled'].includes(booking.status);
        const now = new Date().toISOString();
        const bookingUpdate: Record<string, any> = {
          paymentStatus: 'refunded',
          refundedAt: now,
          refundReference: refundReference || null,
          updatedAt: now,
        };
        if (cancellationReview && canCancel) {
          bookingUpdate.status = 'cancelled';
          bookingUpdate.cancelledAt = booking.cancelledAt || now;
          bookingUpdate.cancellationReason = booking.cancellationReason || 'Cancelled with refund';
        }
        transaction.update(bookingRef, bookingUpdate);

        queueSnapshot.docs.forEach(document => {
          transaction.update(document.ref, {
            status: 'completed',
            refundReference: refundReference || null,
            processedAt: now,
          });
        });
        return {
          patientId: booking.patientId,
          doctorId: booking.doctorId,
          bookingCancelled: cancellationReview && (canCancel || booking.status === 'cancelled'),
        };
      });

      return { success: true, error: null, ...result };
    } catch (error: any) {
      console.error('Error marking refund processed:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔥 NEW: Get pending refunds (for admin dashboard)
  static async getPendingRefunds(): Promise<any[]> {
    try {
      const [creditReviews, manualRefunds] = await Promise.all([
        db.collection('refundQueue').where('status', '==', 'pending_account_credit_review').orderBy('createdAt', 'desc').get(),
        db.collection('refundQueue').where('status', '==', 'pending_manual_refund').orderBy('createdAt', 'desc').get(),
      ]);

      const refunds: any[] = [];
      [...creditReviews.docs, ...manualRefunds.docs].forEach(doc => {
        refunds.push({ id: doc.id, ...doc.data() });
      });
      refunds.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
      return refunds;
    } catch (error) {
      console.error('Error getting pending refunds:', error);
      return [];
    }
  }

  // Update booking status
  static async updateBookingStatus(
    bookingId: string,
    status: Booking['status'],
    reason?: string,
    actor: 'patient' | 'doctor' | 'admin' = 'doctor',
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (status === 'cancelled') {
        const result = await this.cancelBooking(bookingId, reason, actor);
        return { success: result.success, error: result.error };
      }
      if (status === 'confirmed') {
        throw new Error('Bookings are confirmed automatically once payment succeeds');
      }
      if (!['completed', 'no-show'].includes(status)) {
        throw new Error('Unsupported booking status update');
      }
      const bookingRef = db.collection('bookings').doc(bookingId);
      await db.runTransaction(async transaction => {
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists) throw new Error('Booking not found');
        const booking = bookingSnap.data() as Booking;
        const bookingFeeCents = Math.max(0, Math.round(Number(booking.bookingFee || 0) * 100));
        const bookingFeeCreditCents = Math.max(0, Math.floor(Number(booking.bookingFeeCreditCents) || 0));
        const coveredWithoutPayFast = bookingFeeCents === 0 && (
          bookingFeeCreditCents > 0 ||
          booking.paymentMethod === 'membership' ||
          booking.membershipFreeBooking === true ||
          booking.membershipPlanId === 'premium_plus'
        );
        const paymentSatisfied = ['paid', 'waived'].includes(booking.paymentStatus) || coveredWithoutPayFast;
        if (status === 'completed' && !paymentSatisfied) {
          if (bookingFeeCents > 0 && bookingFeeCreditCents > 0) {
            throw new Error(`Account credit was applied, but the remaining R${(bookingFeeCents / 100).toFixed(2)} booking fee must be paid before approval`);
          }
          throw new Error('Booking fee must be paid first');
        }
        if (booking.status === 'cancelled') throw new Error('Cancelled bookings cannot be reopened');
        if (status === 'completed' && !['confirmed', 'rescheduled', 'live'].includes(booking.status)) {
          throw new Error('Only an active appointment can be completed');
        }
        if (status === 'no-show' && !['confirmed', 'rescheduled', 'live'].includes(booking.status)) {
          throw new Error('Only a confirmed appointment can be marked as no-show');
        }

        const now = new Date().toISOString();
        const updateData: Record<string, any> = { status, updatedAt: now };
        // Repair older zero-balance account-credit or membership bookings
        // that were created before the covered status was written atomically.
        if (coveredWithoutPayFast && !['paid', 'waived'].includes(booking.paymentStatus)) {
          updateData.paymentStatus = 'waived';
          updateData.paidAt = booking.paidAt || now;
          if (!booking.paymentMethod) {
            updateData.paymentMethod = bookingFeeCreditCents > 0 ? 'account_credit' : 'membership';
          }
        }
        if (status === 'completed') updateData.completedAt = now;

        if (status === 'completed' && booking.membershipFreeBooking === true && !booking.membershipFreeBookingCountedAt) {
          const membershipRef = db.collection('patientMemberships').doc(booking.patientId);
          const membershipSnap = await transaction.get(membershipRef);
          updateData.membershipFreeBookingCountedAt = now;
          transaction.update(bookingRef, updateData);
          if (membershipSnap.exists) {
            const membership = membershipSnap.data()!;
            const periodMatches = membership.currentPeriodStart === booking.membershipFreeBookingPeriodStart;
            if (membership.audience === 'patient' && membership.planId === 'basic_premium' && periodMatches) {
              const completed = Math.max(0, Number(membership.completedFreeBookings) || 0);
              const reserved = Math.max(0, Number(membership.reservedFreeBookings) || 0);
              transaction.update(membershipRef, {
                completedFreeBookings: Math.min(PATIENT_MEMBERSHIP_PLANS.basic_premium.freeCompletedBookings, completed + 1),
                ...(booking.membershipFreeBookingReleasedAt ? {} : { reservedFreeBookings: Math.max(0, reserved - 1) }),
                updatedAt: now,
              });
            }
          }
          return;
        }
        if (status === 'no-show' && booking.membershipFreeBooking === true &&
            !booking.membershipFreeBookingCountedAt && !booking.membershipFreeBookingReleasedAt) {
          const membershipRef = db.collection('patientMemberships').doc(booking.patientId);
          const membershipSnap = await transaction.get(membershipRef);
          updateData.membershipFreeBookingReleasedAt = now;
          transaction.update(bookingRef, updateData);
          if (membershipSnap.exists && membershipSnap.data()?.currentPeriodStart === booking.membershipFreeBookingPeriodStart) {
            const reserved = Math.max(0, Number(membershipSnap.data()?.reservedFreeBookings) || 0);
            transaction.update(membershipRef, { reservedFreeBookings: Math.max(0, reserved - 1), updatedAt: now });
          }
          return;
        }
        transaction.update(bookingRef, updateData);
      });
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
      await db.runTransaction(async transaction => {
        const [bookingsSnapshot] = await Promise.all([
          transaction.get(db.collection('bookings')
            .where('doctorId', '==', doctorId)
            .where('appointmentDate', '==', date)
            .where('status', 'in', ACTIVE_BOOKING_STATUSES)),
          transaction.get(availabilityRef),
        ]);
        const bookings = bookingsSnapshot.docs.map(document => ({ id: document.id, ...document.data() } as Booking));
        const updatedSlots = slots.map(slot => {
          const activeBooking = bookings.find(booking => intervalsOverlap(
            slot.startTime,
            slot.endTime,
            booking.appointmentTime,
            bookingEndTime(booking.appointmentTime, booking.endTime),
          ));
          const slotWithoutBooking = { ...slot };
          delete slotWithoutBooking.bookingId;
          return {
            ...slotWithoutBooking,
            isAvailable: slot.isAvailable && !activeBooking,
            doctorId,
            ...(activeBooking ? { bookingId: activeBooking.id } : {}),
          };
        });
        transaction.set(availabilityRef, { doctorId, date, slots: updatedSlots, updatedAt: new Date().toISOString() });
      });

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error setting day availability:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔥 Mark booking as paid (called from PayFast ITN handler)
  static async markBookingAsPaid(
    bookingId: string,
    pfPaymentId: string,
    paymentReference: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      await db.collection('bookings').doc(bookingId).update({
        paymentStatus: 'paid',
        pfPaymentId, // PayFast's transaction ID
        paymentReference,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error marking booking as paid:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔥 Mark booking payment as failed (called from ITN or timeout)
  static async markBookingPaymentFailed(
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingSnap = await bookingRef.get();
      if (!bookingSnap.exists) return { success: false, error: 'Booking not found' };

      const booking = bookingSnap.data() as Booking;

      // Free the slot
      await this.updateSlotAvailability(
        booking.doctorId,
        booking.appointmentDate,
        booking.appointmentTime,
        true
      );

      await bookingRef.update({
        paymentStatus: 'failed',
        status: 'cancelled',
        cancellationReason: reason || 'Payment failed',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error marking payment failed:', error);
      return { success: false, error: error.message };
    }
  }
}
