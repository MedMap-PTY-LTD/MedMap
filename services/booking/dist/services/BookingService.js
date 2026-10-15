"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const firebase_1 = require("../config/firebase");
const PaymentService_1 = require("./PaymentService");
const MAX_RESCHEDULES = 2;
const DEFAULT_CONSULTATION_DURATION = 30;
const SLOT_INTERVAL = 30;
class BookingService {
    // Generate default slots (8 AM - 5 PM)
    static generateDefaultSlots(date, duration = DEFAULT_CONSULTATION_DURATION) {
        const slots = [];
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
    static async getAvailableSlots(doctorId, date) {
        try {
            const docRef = firebase_1.db.collection('doctorAvailability').doc(`${doctorId}_${date}`);
            const docSnap = await docRef.get();
            let slots = [];
            if (docSnap.exists) {
                const data = docSnap.data();
                slots = data.slots || [];
            }
            else {
                slots = this.generateDefaultSlots(date);
            }
            // Get booked slots
            const bookingsSnapshot = await firebase_1.db.collection('bookings')
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
        }
        catch (error) {
            console.error('Error getting available slots:', error);
            return [];
        }
    }
    // Update slot availability
    static async updateSlotAvailability(doctorId, date, time, isAvailable, bookingId) {
        try {
            const docRef = firebase_1.db.collection('doctorAvailability').doc(`${doctorId}_${date}`);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
                const slots = this.generateDefaultSlots(date);
                const updatedSlots = slots.map(slot => slot.startTime === time
                    ? { ...slot, isAvailable, doctorId, bookingId }
                    : { ...slot, doctorId });
                await docRef.set({
                    doctorId,
                    date,
                    slots: updatedSlots,
                    updatedAt: new Date().toISOString(),
                });
                return;
            }
            const data = docSnap.data();
            const updatedSlots = (data.slots || []).map(slot => slot.startTime === time
                ? { ...slot, isAvailable, doctorId, bookingId }
                : slot);
            await docRef.update({
                slots: updatedSlots,
                updatedAt: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error updating slot availability:', error);
            throw error;
        }
    }
    // Create booking with transaction
    static async createBooking(bookingData) {
        try {
            const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const result = await firebase_1.db.runTransaction(async (transaction) => {
                const availabilityRef = firebase_1.db.collection('doctorAvailability').doc(`${bookingData.doctorId}_${bookingData.appointmentDate}`);
                const [existingBookingsSnapshot, availabilitySnap] = await Promise.all([
                    transaction.get(firebase_1.db.collection('bookings')
                        .where('doctorId', '==', bookingData.doctorId)
                        .where('appointmentDate', '==', bookingData.appointmentDate)
                        .where('appointmentTime', '==', bookingData.appointmentTime)
                        .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])),
                    transaction.get(availabilityRef),
                ]);
                if (!existingBookingsSnapshot.empty) {
                    throw new Error('This slot is no longer available');
                }
                const now = new Date().toISOString();
                const booking = {
                    id: bookingId,
                    ...bookingData,
                    status: 'pending',
                    paymentStatus: 'unpaid',
                    rescheduleCount: 0,
                    maxReschedules: MAX_RESCHEDULES,
                    rescheduleHistory: [],
                    createdAt: now,
                    updatedAt: now,
                };
                const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
                transaction.set(bookingRef, booking);
                if (availabilitySnap.exists) {
                    const data = availabilitySnap.data();
                    const updatedSlots = (data.slots || []).map(slot => slot.startTime === bookingData.appointmentTime
                        ? { ...slot, isAvailable: false, bookingId }
                        : slot);
                    transaction.update(availabilityRef, {
                        slots: updatedSlots,
                        updatedAt: now,
                    });
                }
                return bookingId;
            });
            return { bookingId: result, error: null };
        }
        catch (error) {
            console.error('Error creating booking:', error);
            return { bookingId: '', error: error.message };
        }
    }
    // 🔥 Create booking + PayFast payment form together
    static async createBookingWithPayment(bookingData, paymentMethod = 'card') {
        const { bookingId, error } = await this.createBooking(bookingData);
        if (error || !bookingId) {
            return { bookingId: '', error };
        }
        try {
            const paymentResult = await PaymentService_1.PaymentService.createPaymentIntent({
                bookingId,
                amount: bookingData.consultationFee,
                currency: 'ZAR',
                customerEmail: bookingData.patientEmail,
                customerName: bookingData.patientName,
                description: `Consultation with Dr. ${bookingData.doctorName}`,
                paymentMethod,
            });
            if (paymentResult.error) {
                // Rollback booking + free slot on payment init failure
                await this.updateSlotAvailability(bookingData.doctorId, bookingData.appointmentDate, bookingData.appointmentTime, true);
                await firebase_1.db.collection('bookings').doc(bookingId).delete();
                return { bookingId: '', error: paymentResult.error };
            }
            return {
                bookingId,
                paymentUrl: paymentResult.paymentUrl,
                formHtml: paymentResult.formHtml,
                error: null
            };
        }
        catch (err) {
            // Rollback
            await this.updateSlotAvailability(bookingData.doctorId, bookingData.appointmentDate, bookingData.appointmentTime, true);
            await firebase_1.db.collection('bookings').doc(bookingId).delete();
            return { bookingId: '', error: err.message };
        }
    }
    // Get booking by ID
    static async getBooking(bookingId) {
        try {
            const docSnap = await firebase_1.db.collection('bookings').doc(bookingId).get();
            if (docSnap.exists) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        }
        catch (error) {
            console.error('Error getting booking:', error);
            return null;
        }
    }
    // Get doctor bookings
    static async getDoctorBookings(doctorId, status) {
        try {
            let query = firebase_1.db.collection('bookings')
                .where('doctorId', '==', doctorId)
                .orderBy('appointmentDate', 'desc');
            if (status) {
                query = query.where('status', '==', status);
            }
            const snapshot = await query.get();
            const bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });
            return bookings;
        }
        catch (error) {
            console.error('Error getting doctor bookings:', error);
            return [];
        }
    }
    // Get patient bookings
    static async getPatientBookings(patientId) {
        try {
            const snapshot = await firebase_1.db.collection('bookings')
                .where('patientId', '==', patientId)
                .orderBy('appointmentDate', 'desc')
                .get();
            const bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });
            return bookings;
        }
        catch (error) {
            console.error('Error getting patient bookings:', error);
            return [];
        }
    }
    // Get upcoming bookings for a doctor
    static async getUpcomingBookings(doctorId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const snapshot = await firebase_1.db.collection('bookings')
                .where('doctorId', '==', doctorId)
                .where('appointmentDate', '>=', today)
                .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])
                .orderBy('appointmentDate', 'asc')
                .orderBy('appointmentTime', 'asc')
                .limit(50)
                .get();
            const bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });
            return bookings;
        }
        catch (error) {
            console.error('Error getting upcoming bookings:', error);
            return [];
        }
    }
    // Get booking stats
    static async getBookingStats(doctorId) {
        try {
            const bookings = await this.getDoctorBookings(doctorId);
            return {
                total: bookings.length,
                pending: bookings.filter(b => b.status === 'pending').length,
                confirmed: bookings.filter(b => b.status === 'confirmed').length,
                completed: bookings.filter(b => b.status === 'completed').length,
                cancelled: bookings.filter(b => b.status === 'cancelled').length,
                revenue: bookings
                    .filter(b => b.paymentStatus === 'paid')
                    .reduce((sum, b) => sum + (b.consultationFee || 0), 0),
            };
        }
        catch (error) {
            console.error('Error getting booking stats:', error);
            return { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 };
        }
    }
    // Reschedule booking
    static async rescheduleBooking(bookingId, newDate, newTime, reason) {
        try {
            const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
            await firebase_1.db.runTransaction(async (transaction) => {
                const bookingSnap = await transaction.get(bookingRef);
                if (!bookingSnap.exists) {
                    throw new Error('Booking not found');
                }
                const booking = bookingSnap.data();
                const oldAvailabilityRef = firebase_1.db.collection('doctorAvailability').doc(`${booking.doctorId}_${booking.appointmentDate}`);
                const newAvailabilityRef = firebase_1.db.collection('doctorAvailability').doc(`${booking.doctorId}_${newDate}`);
                const [existingBookingsSnapshot, oldAvailabilitySnap, newAvailabilitySnap] = await Promise.all([
                    transaction.get(firebase_1.db.collection('bookings')
                        .where('doctorId', '==', booking.doctorId)
                        .where('appointmentDate', '==', newDate)
                        .where('appointmentTime', '==', newTime)
                        .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])),
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
                        ? oldAvailabilitySnap.data().slots.map(slot => slot.startTime === booking.appointmentTime
                            ? { ...slot, isAvailable: true, doctorId: booking.doctorId }
                            : { ...slot, doctorId: booking.doctorId })
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
                    }
                    else {
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
                const historyEntry = {
                    fromDate: booking.appointmentDate,
                    fromTime: booking.appointmentTime,
                    toDate: newDate,
                    toTime: newTime,
                    rescheduledAt: new Date().toISOString(),
                    reason,
                };
                const now = new Date().toISOString();
                const oldSlots = oldAvailabilitySnap.exists ? oldAvailabilitySnap.data().slots || [] : [];
                const restoredOldSlots = oldSlots.map(slot => slot.startTime === booking.appointmentTime
                    ? { ...slot, isAvailable: true, doctorId: booking.doctorId }
                    : { ...slot, doctorId: booking.doctorId });
                const blockedNewSlots = newAvailabilitySnap.exists
                    ? newAvailabilitySnap.data().slots.map(slot => slot.startTime === newTime
                        ? { ...slot, isAvailable: false, doctorId: booking.doctorId, bookingId }
                        : { ...slot, doctorId: booking.doctorId })
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
                }
                else {
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
                }
                else {
                    transaction.set(newAvailabilityRef, {
                        doctorId: booking.doctorId,
                        date: newDate,
                        slots: blockedNewSlots,
                        updatedAt: now,
                    });
                }
            });
            return { success: true, error: null };
        }
        catch (error) {
            console.error('Error rescheduling booking:', error);
            return { success: false, error: error.message };
        }
    }
    // 🔥 Updated: Cancel booking with PayFast-aware refund handling
    static async cancelBooking(bookingId, reason) {
        try {
            const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
            const bookingSnap = await bookingRef.get();
            if (!bookingSnap.exists) {
                return { success: false, error: 'Booking not found' };
            }
            const booking = bookingSnap.data();
            let refundPending = false;
            // Free the slot
            await this.updateSlotAvailability(booking.doctorId, booking.appointmentDate, booking.appointmentTime, true);
            // Determine payment status after cancellation
            let newPaymentStatus = booking.paymentStatus;
            if (booking.paymentStatus === 'paid') {
                // ⚠️ PayFast refunds require either:
                //   1. Manual processing via PayFast dashboard, OR
                //   2. Special API access (request from PayFast, not available in sandbox)
                // We mark as 'refund_pending' and let an admin process it.
                newPaymentStatus = 'refund_pending';
                refundPending = true;
                // Log for admin visibility
                await firebase_1.db.collection('refundQueue').add({
                    bookingId,
                    paymentId: booking.paymentId,
                    pfPaymentId: booking.pfPaymentId || null,
                    amount: booking.consultationFee,
                    customerEmail: booking.patientEmail,
                    customerName: booking.patientName,
                    reason: reason || 'Cancelled by patient',
                    status: 'pending_manual_refund',
                    createdAt: new Date().toISOString(),
                });
                console.log(`⚠️ Refund needed for booking ${bookingId} — process manually in PayFast dashboard`);
            }
            else if (booking.paymentStatus === 'pending') {
                // Payment was initiated but never completed — safe to mark as failed
                newPaymentStatus = 'failed';
            }
            await bookingRef.update({
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancellationReason: reason || 'Cancelled by patient',
                paymentStatus: newPaymentStatus,
                updatedAt: new Date().toISOString(),
            });
            return { success: true, error: null, refundPending };
        }
        catch (error) {
            console.error('Error cancelling booking:', error);
            return { success: false, error: error.message };
        }
    }
    // 🔥 NEW: Admin marks a refund as processed (after doing it in PayFast dashboard)
    static async markRefundProcessed(bookingId, refundReference) {
        try {
            const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
            const bookingSnap = await bookingRef.get();
            if (!bookingSnap.exists) {
                return { success: false, error: 'Booking not found' };
            }
            await bookingRef.update({
                paymentStatus: 'refunded',
                refundedAt: new Date().toISOString(),
                refundReference: refundReference || null,
                updatedAt: new Date().toISOString(),
            });
            // Update the refund queue entry if it exists
            const queueSnapshot = await firebase_1.db.collection('refundQueue')
                .where('bookingId', '==', bookingId)
                .where('status', '==', 'pending_manual_refund')
                .get();
            const batch = firebase_1.db.batch();
            queueSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    status: 'completed',
                    refundReference: refundReference || null,
                    processedAt: new Date().toISOString(),
                });
            });
            await batch.commit();
            return { success: true, error: null };
        }
        catch (error) {
            console.error('Error marking refund processed:', error);
            return { success: false, error: error.message };
        }
    }
    // 🔥 NEW: Get pending refunds (for admin dashboard)
    static async getPendingRefunds() {
        try {
            const snapshot = await firebase_1.db.collection('refundQueue')
                .where('status', '==', 'pending_manual_refund')
                .orderBy('createdAt', 'desc')
                .get();
            const refunds = [];
            snapshot.forEach(doc => {
                refunds.push({ id: doc.id, ...doc.data() });
            });
            return refunds;
        }
        catch (error) {
            console.error('Error getting pending refunds:', error);
            return [];
        }
    }
    // Update booking status
    static async updateBookingStatus(bookingId, status, reason) {
        try {
            const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
            const updateData = {
                status,
                updatedAt: new Date().toISOString(),
            };
            if (status === 'cancelled' && reason) {
                updateData.cancelledAt = new Date().toISOString();
                updateData.cancellationReason = reason;
            }
            else if (status === 'confirmed') {
                updateData.confirmedAt = new Date().toISOString();
            }
            else if (status === 'completed') {
                updateData.completedAt = new Date().toISOString();
            }
            await bookingRef.update(updateData);
            return { success: true, error: null };
        }
        catch (error) {
            console.error('Error updating booking status:', error);
            return { success: false, error: error.message };
        }
    }
    // Set day availability
    static async setDayAvailability(doctorId, date, slots) {
        try {
            const availabilityRef = firebase_1.db.collection('doctorAvailability').doc(`${doctorId}_${date}`);
            const bookingsSnapshot = await firebase_1.db.collection('bookings')
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
        }
        catch (error) {
            console.error('Error setting day availability:', error);
            return { success: false, error: error.message };
        }
    }
    // 🔥 Mark booking as paid (called from PayFast ITN handler)
    static async markBookingAsPaid(bookingId, pfPaymentId, paymentReference) {
        try {
            await firebase_1.db.collection('bookings').doc(bookingId).update({
                paymentStatus: 'paid',
                pfPaymentId, // PayFast's transaction ID
                paymentReference,
                status: 'confirmed',
                confirmedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            return { success: true, error: null };
        }
        catch (error) {
            console.error('Error marking booking as paid:', error);
            return { success: false, error: error.message };
        }
    }
    // 🔥 Mark booking payment as failed (called from ITN or timeout)
    static async markBookingPaymentFailed(bookingId, reason) {
        try {
            const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
            const bookingSnap = await bookingRef.get();
            if (!bookingSnap.exists)
                return { success: false, error: 'Booking not found' };
            const booking = bookingSnap.data();
            // Free the slot
            await this.updateSlotAvailability(booking.doctorId, booking.appointmentDate, booking.appointmentTime, true);
            await bookingRef.update({
                paymentStatus: 'failed',
                status: 'cancelled',
                cancellationReason: reason || 'Payment failed',
                cancelledAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            return { success: true, error: null };
        }
        catch (error) {
            console.error('Error marking payment failed:', error);
            return { success: false, error: error.message };
        }
    }
}
exports.BookingService = BookingService;
//# sourceMappingURL=BookingService.js.map