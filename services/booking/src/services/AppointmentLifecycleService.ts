import { Server } from 'socket.io';
import { db } from '../config/firebase';
import { Booking, BookingEvents } from '../types';
import { PATIENT_MEMBERSHIP_PLANS } from './PatientMembershipService';

const ACTIVE_APPOINTMENT_STATUSES: Booking['status'][] = ['confirmed', 'rescheduled', 'live'];
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const SOUTH_AFRICA_OFFSET = '+02:00';

interface CompletedBookingNotice {
  bookingId: string;
  patientId: string;
  doctorId: string;
  completedAt: string;
}

function appointmentEndTimestamp(booking: Partial<Booking>): number {
  if (!booking.appointmentDate) return Number.NaN;
  const time = booking.endTime || booking.appointmentTime;
  if (!time) return Number.NaN;
  return Date.parse(`${booking.appointmentDate}T${time}:00${SOUTH_AFRICA_OFFSET}`);
}

export class AppointmentLifecycleService {
  private static running = false;

  static start(io?: Server): void {
    if (this.running) return;
    this.running = true;
    const run = () => {
      void this.sweep().then(completed => {
        for (const booking of completed) {
          const payload = { bookingId: booking.bookingId, status: 'completed', completedAt: booking.completedAt };
          if (booking.patientId) io?.to(`patient_${booking.patientId}`).emit(BookingEvents.BOOKING_UPDATED, payload);
          if (booking.doctorId) io?.to(`doctor_${booking.doctorId}`).emit(BookingEvents.BOOKING_UPDATED, payload);
        }
      }).catch(error => console.error('Appointment lifecycle sweep failed:', error));
    };

    run();
    setInterval(run, SWEEP_INTERVAL_MS).unref?.();
  }

  static async sweep(nowMs = Date.now()): Promise<CompletedBookingNotice[]> {
    const snapshot = await db.collection('bookings')
      .where('status', 'in', ACTIVE_APPOINTMENT_STATUSES)
      .get();
    const completed: CompletedBookingNotice[] = [];

    for (const document of snapshot.docs) {
      const bookingRef = document.ref;
      const notice = await db.runTransaction(async transaction => {
        const current = await transaction.get(bookingRef);
        if (!current.exists) return null;

        const booking = current.data() as Booking;
        if (!ACTIVE_APPOINTMENT_STATUSES.includes(booking.status) ||
            !['paid', 'waived'].includes(booking.paymentStatus) ||
            appointmentEndTimestamp(booking) > nowMs) return null;

        const now = new Date(nowMs).toISOString();
        const update: Record<string, any> = {
          status: 'completed',
          completedAt: now,
          updatedAt: now,
        };

        const membershipRef = booking.membershipFreeBooking === true && !booking.membershipFreeBookingCountedAt
          ? db.collection('patientMemberships').doc(booking.patientId)
          : null;
        const membershipSnap = membershipRef ? await transaction.get(membershipRef) : null;

        if (membershipRef && membershipSnap) {
          update.membershipFreeBookingCountedAt = now;
          if (membershipSnap.exists) {
            const membership = membershipSnap.data()!;
            const periodMatches = membership.currentPeriodStart === booking.membershipFreeBookingPeriodStart;
            if (membership.audience === 'patient' && membership.planId === 'basic_premium' && periodMatches) {
              const completedCount = Math.max(0, Number(membership.completedFreeBookings) || 0);
              const reservedCount = Math.max(0, Number(membership.reservedFreeBookings) || 0);
              update.updatedAt = now;
              transaction.update(membershipRef, {
                completedFreeBookings: Math.min(
                  PATIENT_MEMBERSHIP_PLANS.basic_premium.freeCompletedBookings,
                  completedCount + 1,
                ),
                ...(booking.membershipFreeBookingReleasedAt ? {} : { reservedFreeBookings: Math.max(0, reservedCount - 1) }),
                updatedAt: now,
              });
            }
          }
        }

        transaction.update(bookingRef, update);
        return {
          bookingId: bookingRef.id,
          patientId: booking.patientId,
          doctorId: booking.doctorId,
          completedAt: now,
        };
      });

      if (notice) completed.push(notice);
    }

    if (completed.length) {
      console.info(`Appointment lifecycle sweep completed ${completed.length} booking(s)`);
    }
    return completed;
  }
}
