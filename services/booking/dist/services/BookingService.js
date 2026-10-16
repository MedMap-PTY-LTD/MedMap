"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const firebase_1 = require("../config/firebase");
const PaymentService_1 = require("./PaymentService");
const PatientMembershipService_1 = require("./PatientMembershipService");
const membershipAccess_1 = require("./membershipAccess");
const AccountCreditService_1 = require("./AccountCreditService");
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
            const creditRef = (0, AccountCreditService_1.accountCreditRef)(bookingData.patientId);
            const debitLedgerRef = (0, AccountCreditService_1.accountCreditTransactionRef)(bookingData.patientId, `booking_${bookingId}_debit`);
            const result = await firebase_1.db.runTransaction(async (transaction) => {
                const availabilityRef = firebase_1.db.collection('doctorAvailability').doc(`${bookingData.doctorId}_${bookingData.appointmentDate}`);
                const membershipRef = firebase_1.db.collection('patientMemberships').doc(bookingData.patientId);
                const [existingBookingsSnapshot, availabilitySnap, membershipSnap, creditSnap, debitLedgerSnap] = await Promise.all([
                    transaction.get(firebase_1.db.collection('bookings')
                        .where('doctorId', '==', bookingData.doctorId)
                        .where('appointmentDate', '==', bookingData.appointmentDate)
                        .where('appointmentTime', '==', bookingData.appointmentTime)
                        .where('status', 'in', ['pending', 'confirmed', 'rescheduled'])),
                    transaction.get(availabilityRef),
                    transaction.get(membershipRef),
                    transaction.get(creditRef),
                    transaction.get(debitLedgerRef),
                ]);
                if (!existingBookingsSnapshot.empty) {
                    throw new Error('This slot is no longer available');
                }
                const slots = availabilitySnap.exists
                    ? availabilitySnap.data().slots
                    : this.generateDefaultSlots(bookingData.appointmentDate);
                const selected = slots.find(slot => slot.startTime === bookingData.appointmentTime);
                if (!selected || !selected.isAvailable) {
                    throw new Error('This slot is not available');
                }
                const now = new Date().toISOString();
                const membership = membershipSnap.exists ? membershipSnap.data() : undefined;
                const membershipCurrent = !!membership && membership.audience === 'patient' && (0, membershipAccess_1.hasPaidMembershipAccess)(membership);
                let membershipPlanId = 'free';
                let membershipFreeBooking = false;
                let membershipFreeBookingPeriodStart = null;
                let bookingFee = PaymentService_1.BOOKING_FEE;
                let freeBookingsRemaining = 0;
                if (membershipCurrent && membership?.audience === 'patient' && membership.planId === 'premium_plus') {
                    membershipPlanId = 'premium_plus';
                    membershipFreeBookingPeriodStart = membership.currentPeriodStart || null;
                    bookingFee = 0;
                }
                else if (membershipCurrent && membership?.audience === 'patient' && membership.planId === 'basic_premium') {
                    membershipPlanId = 'basic_premium';
                    membershipFreeBookingPeriodStart = membership.currentPeriodStart || null;
                    const limit = PatientMembershipService_1.PATIENT_MEMBERSHIP_PLANS.basic_premium.freeCompletedBookings;
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
                if (creditAppliedCents > 0) {
                    if (debitLedgerSnap.exists)
                        throw new Error('Account credit was already applied to this booking');
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
                const booking = {
                    id: bookingId,
                    ...bookingData,
                    bookingFee: payableFeeCents / 100,
                    bookingFeeTotal: assessedFeeCents / 100,
                    bookingFeeCreditCents: creditAppliedCents,
                    membershipPlanId,
                    membershipFreeBooking,
                    membershipFreeBookingPeriodStart,
                    status: 'pending',
                    paymentStatus: 'unpaid',
                    rescheduleCount: 0,
                    maxReschedules: MAX_RESCHEDULES,
                    rescheduleHistory: [],
                    ...(creditAppliedCents > 0 && payableFeeCents === 0 ? { paymentMethod: 'account_credit' } : {}),
                    ...(creditAppliedCents > 0 && payableFeeCents > 0 ? { paymentMethod: 'mixed' } : {}),
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
        }
        catch (error) {
            console.error('Error creating booking:', error);
            return { bookingId: '', bookingFee: 0, bookingFeeCredit: 0, bookingFeeTotal: 0, membershipPlanId: 'free', freeBookingsRemaining: 0, error: error.message };
        }
    }
    // 🔥 Create booking + PayFast payment form together
    static async createBookingWithPayment(bookingData, paymentMethod = 'card') {
        try {
            PaymentService_1.PaymentService.ensureConfigured();
        }
        catch (err) {
            return { bookingId: '', bookingFee: 0, bookingFeeCredit: 0, bookingFeeTotal: 0, error: err.message };
        }
        const paymentEnvironment = PaymentService_1.PaymentService.currentMode();
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
            const now = new Date().toISOString();
            await firebase_1.db.collection('bookings').doc(bookingId).update({
                status: 'confirmed',
                paymentStatus: 'waived',
                paymentMethod: created.bookingFeeCredit > 0 ? 'account_credit' : 'membership',
                paidAt: now,
                confirmedAt: now,
                updatedAt: now,
            });
            return { bookingId, bookingFee, bookingFeeCredit: created.bookingFeeCredit, bookingFeeTotal: created.bookingFeeTotal, membershipPlanId: created.membershipPlanId, freeBookingsRemaining: created.freeBookingsRemaining, error: null };
        }
        try {
            const checkout = await PaymentService_1.PaymentService.createPaymentIntent(bookingId);
            return { bookingId, checkout, bookingFee, bookingFeeCredit: created.bookingFeeCredit, bookingFeeTotal: created.bookingFeeTotal, membershipPlanId: created.membershipPlanId, freeBookingsRemaining: created.freeBookingsRemaining, error: null };
        }
        catch (err) {
            // Keep the booking so the patient can retry payment or cancel it.
            return { bookingId, bookingFee, bookingFeeCredit: created.bookingFeeCredit, bookingFeeTotal: created.bookingFeeTotal, membershipPlanId: created.membershipPlanId, freeBookingsRemaining: created.freeBookingsRemaining, error: err.message };
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
                totalPatients: new Set(bookings.map(booking => booking.patientId).filter(Boolean)).size,
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
            return { total: 0, totalPatients: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 };
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
                if (!['pending', 'confirmed', 'rescheduled'].includes(booking.status)) {
                    throw new Error('This booking cannot be rescheduled');
                }
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
                    reason: reason || '',
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
                    status: ['paid', 'waived'].includes(booking.paymentStatus) ? 'rescheduled' : 'pending',
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
    // Cancellation retains the booking fee by default and queues paid fees for admin exception review.
    static async cancelBooking(bookingId, reason) {
        try {
            const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
            const creditReviewPending = await firebase_1.db.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(bookingRef);
                if (!snapshot.exists)
                    throw new Error('Booking not found');
                const booking = snapshot.data();
                if (booking.status === 'cancelled')
                    throw new Error('Booking is already cancelled');
                if (booking.status === 'completed')
                    throw new Error('Completed bookings cannot be cancelled');
                const availabilityRef = firebase_1.db.collection('doctorAvailability').doc(booking.doctorId + '_' + booking.appointmentDate);
                const paymentRef = booking.paymentId ? firebase_1.db.collection('payments').doc(booking.paymentId) : null;
                const totalFeeCents = Math.max(0, booking.bookingFeeTotal != null
                    ? Math.round(Number(booking.bookingFeeTotal) * 100)
                    : Math.round(Number(booking.bookingFee || 0) * 100) + Math.floor(Number(booking.bookingFeeCreditCents) || 0));
                const refundReviewRef = firebase_1.db.collection('refundQueue').doc(`cancel_${bookingId}`);
                const membershipRef = booking.membershipFreeBooking === true && !booking.membershipFreeBookingCountedAt &&
                    !booking.membershipFreeBookingReleasedAt
                    ? firebase_1.db.collection('patientMemberships').doc(booking.patientId)
                    : null;
                const [availability, payment, membershipSnap] = await Promise.all([
                    transaction.get(availabilityRef),
                    paymentRef ? transaction.get(paymentRef) : Promise.resolve(null),
                    membershipRef ? transaction.get(membershipRef) : Promise.resolve(null),
                ]);
                const now = new Date().toISOString();
                const needsCreditReview = booking.paymentStatus === 'paid' && totalFeeCents > 0;
                if (availability.exists) {
                    const slots = availability.data().slots.map(slot => {
                        if (slot.startTime !== booking.appointmentTime ||
                            (slot.bookingId && slot.bookingId !== bookingId))
                            return slot;
                        const { bookingId: previousBookingId, ...rest } = slot;
                        return { ...rest, isAvailable: true };
                    });
                    transaction.update(availabilityRef, { slots, updatedAt: now });
                }
                if (needsCreditReview) {
                    transaction.set(refundReviewRef, {
                        bookingId, paymentId: booking.paymentId || null,
                        pfPaymentId: booking.pfPaymentId || null,
                        patientId: booking.patientId,
                        amount: totalFeeCents / 100,
                        amountCents: totalFeeCents,
                        customerEmail: booking.patientEmail || '', customerName: booking.patientName || '',
                        doctorName: booking.doctorName || '',
                        appointmentDate: booking.appointmentDate || '',
                        appointmentTime: booking.appointmentTime || '',
                        reason: reason || 'Cancelled by patient',
                        environment: payment?.data()?.environment ?? booking.paymentEnvironment ?? 'sandbox',
                        reviewType: 'booking_cancellation',
                        status: 'pending_account_credit_review', createdAt: now,
                    });
                }
                if (membershipRef && membershipSnap?.exists &&
                    membershipSnap.data()?.currentPeriodStart === booking.membershipFreeBookingPeriodStart) {
                    const reserved = Math.max(0, Number(membershipSnap.data()?.reservedFreeBookings) || 0);
                    transaction.update(membershipRef, { reservedFreeBookings: Math.max(0, reserved - 1), updatedAt: now });
                }
                transaction.update(bookingRef, {
                    status: 'cancelled', cancelledAt: now,
                    cancellationReason: reason || 'Cancelled by patient',
                    ...(membershipRef ? { membershipFreeBookingReleasedAt: now } : {}),
                    ...(needsCreditReview ? { refundCreditStatus: 'pending_review' } : {}),
                    ...(booking.paymentStatus === 'pending' ? { paymentStatus: 'failed' } : {}),
                    updatedAt: now,
                });
                return needsCreditReview;
            });
            return { success: true, error: null, creditReviewPending };
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
            const [creditReviews, manualRefunds] = await Promise.all([
                firebase_1.db.collection('refundQueue').where('status', '==', 'pending_account_credit_review').orderBy('createdAt', 'desc').get(),
                firebase_1.db.collection('refundQueue').where('status', '==', 'pending_manual_refund').orderBy('createdAt', 'desc').get(),
            ]);
            const refunds = [];
            [...creditReviews.docs, ...manualRefunds.docs].forEach(doc => {
                refunds.push({ id: doc.id, ...doc.data() });
            });
            refunds.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
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
            if (status === 'cancelled') {
                const result = await this.cancelBooking(bookingId, reason);
                return { success: result.success, error: result.error };
            }
            const bookingRef = firebase_1.db.collection('bookings').doc(bookingId);
            await firebase_1.db.runTransaction(async (transaction) => {
                const bookingSnap = await transaction.get(bookingRef);
                if (!bookingSnap.exists)
                    throw new Error('Booking not found');
                const booking = bookingSnap.data();
                if ((status === 'confirmed' || status === 'completed') && !['paid', 'waived'].includes(booking.paymentStatus)) {
                    throw new Error('Booking fee must be paid first');
                }
                if (booking.status === 'cancelled')
                    throw new Error('Cancelled bookings cannot be reopened');
                const now = new Date().toISOString();
                const updateData = { status, updatedAt: now };
                if (status === 'confirmed')
                    updateData.confirmedAt = now;
                if (status === 'completed')
                    updateData.completedAt = now;
                if (status === 'completed' && booking.membershipFreeBooking === true && !booking.membershipFreeBookingCountedAt) {
                    const membershipRef = firebase_1.db.collection('patientMemberships').doc(booking.patientId);
                    const membershipSnap = await transaction.get(membershipRef);
                    updateData.membershipFreeBookingCountedAt = now;
                    transaction.update(bookingRef, updateData);
                    if (membershipSnap.exists) {
                        const membership = membershipSnap.data();
                        const periodMatches = membership.currentPeriodStart === booking.membershipFreeBookingPeriodStart;
                        if (membership.audience === 'patient' && membership.planId === 'basic_premium' && periodMatches) {
                            const completed = Math.max(0, Number(membership.completedFreeBookings) || 0);
                            const reserved = Math.max(0, Number(membership.reservedFreeBookings) || 0);
                            transaction.update(membershipRef, {
                                completedFreeBookings: Math.min(PatientMembershipService_1.PATIENT_MEMBERSHIP_PLANS.basic_premium.freeCompletedBookings, completed + 1),
                                ...(booking.membershipFreeBookingReleasedAt ? {} : { reservedFreeBookings: Math.max(0, reserved - 1) }),
                                updatedAt: now,
                            });
                        }
                    }
                    return;
                }
                if (status === 'no-show' && booking.membershipFreeBooking === true &&
                    !booking.membershipFreeBookingCountedAt && !booking.membershipFreeBookingReleasedAt) {
                    const membershipRef = firebase_1.db.collection('patientMemberships').doc(booking.patientId);
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