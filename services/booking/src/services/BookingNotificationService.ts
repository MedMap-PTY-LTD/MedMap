import { Server } from 'socket.io';
import { db } from '../config/firebase';
import { BookingEvents } from '../types';

export type BookingNotificationKind = 'booking_created' | 'booking_cancelled' | 'booking_payment_expired';

interface BookingNotificationInput {
  userId: string;
  room: 'doctor' | 'patient';
  id: string;
  type: BookingNotificationKind;
  title: string;
  message: string;
  bookingId: string;
  actionUrl?: string;
  eventPayload?: Record<string, unknown>;
}

export class BookingNotificationService {
  private static io?: Server;

  static configure(io: Server): void {
    this.io = io;
  }

  static emitToUser(room: 'doctor' | 'patient', userId: string, event: string, payload: Record<string, unknown>): void {
    this.io?.to(`${room}_${userId}`).emit(event, payload);
  }

  static async notify(input: BookingNotificationInput): Promise<void> {
    try {
      const notificationRef = db.collection('users').doc(input.userId)
        .collection('bookingNotifications').doc(input.id);
      const createdAt = new Date().toISOString();
      const notification = {
        id: input.id,
        type: input.type,
        title: input.title,
        message: input.message,
        bookingId: input.bookingId,
        actionUrl: input.actionUrl || '/bookings',
        read: false,
        createdAt,
      };
      const created = await db.runTransaction(async transaction => {
        const existing = await transaction.get(notificationRef);
        if (existing.exists) return false;
        transaction.create(notificationRef, notification);
        return true;
      });
      if (!created) return;

      this.io?.to(`${input.room}_${input.userId}`).emit('booking:notification', notification);
      if (input.type === 'booking_created') {
        this.io?.to(`doctor_${input.userId}`).emit(BookingEvents.BOOKING_CREATED, {
          bookingId: input.bookingId,
          ...input.eventPayload,
        });
      }
    } catch (error) {
      // Booking/payment transitions must not fail because a notification could not be delivered.
      console.error('Could not persist booking notification:', error);
    }
  }
}
