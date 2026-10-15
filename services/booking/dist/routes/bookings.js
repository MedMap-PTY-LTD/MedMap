"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/bookings.ts
const express_1 = require("express");
const BookingService_1 = require("../services/BookingService");
const router = (0, express_1.Router)();
// ==================== CREATE BOOKING + PAYFAST ====================
// 🔥 Create booking + return PayFast form HTML
router.post('/api/bookings/create-with-payment', async (req, res) => {
    try {
        const result = await BookingService_1.BookingService.createBookingWithPayment({
            doctorId: req.body.doctorId,
            patientId: req.body.patientId,
            patientName: req.body.patientName,
            patientEmail: req.body.patientEmail,
            patientPhone: req.body.patientPhone,
            doctorName: req.body.doctorName,
            doctorSpecialization: req.body.doctorSpecialization,
            appointmentDate: req.body.appointmentDate,
            appointmentTime: req.body.appointmentTime,
            endTime: req.body.endTime,
            consultationFee: req.body.consultationFee,
            notes: req.body.notes,
        });
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.json({
            bookingId: result.bookingId,
            formHtml: result.formHtml,
            paymentUrl: result.paymentUrl,
        });
    }
    catch (error) {
        console.error('create-with-payment error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== READ ====================
// Get a single booking by ID
router.get('/api/bookings/:bookingId', async (req, res) => {
    try {
        const booking = await BookingService_1.BookingService.getBooking(req.params.bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(booking);
    }
    catch (error) {
        console.error('getBooking error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get all bookings for a patient
router.get('/api/bookings/patient/:patientId', async (req, res) => {
    try {
        const bookings = await BookingService_1.BookingService.getPatientBookings(req.params.patientId);
        res.json(bookings);
    }
    catch (error) {
        console.error('getPatientBookings error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get all bookings for a doctor (optional ?status=confirmed)
router.get('/api/bookings/doctor/:doctorId', async (req, res) => {
    try {
        const bookings = await BookingService_1.BookingService.getDoctorBookings(req.params.doctorId, req.query.status);
        res.json(bookings);
    }
    catch (error) {
        console.error('getDoctorBookings error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get upcoming bookings for a doctor
router.get('/api/bookings/doctor/:doctorId/upcoming', async (req, res) => {
    try {
        const bookings = await BookingService_1.BookingService.getUpcomingBookings(req.params.doctorId);
        res.json(bookings);
    }
    catch (error) {
        console.error('getUpcomingBookings error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get booking stats for a doctor
router.get('/api/bookings/doctor/:doctorId/stats', async (req, res) => {
    try {
        const stats = await BookingService_1.BookingService.getBookingStats(req.params.doctorId);
        res.json(stats);
    }
    catch (error) {
        console.error('getBookingStats error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== SLOTS ====================
// Get available slots for a doctor on a date
router.get('/api/bookings/slots/:doctorId/:date', async (req, res) => {
    try {
        const slots = await BookingService_1.BookingService.getAvailableSlots(req.params.doctorId, req.params.date);
        res.json(slots);
    }
    catch (error) {
        console.error('getAvailableSlots error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Set day availability for a doctor
router.post('/api/bookings/slots/:doctorId/:date', async (req, res) => {
    try {
        const result = await BookingService_1.BookingService.setDayAvailability(req.params.doctorId, req.params.date, req.body.slots || []);
        res.json(result);
    }
    catch (error) {
        console.error('setDayAvailability error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== ACTIONS ====================
// Reschedule a booking
router.post('/api/bookings/:bookingId/reschedule', async (req, res) => {
    try {
        const result = await BookingService_1.BookingService.rescheduleBooking(req.params.bookingId, req.body.newDate, req.body.newTime, req.body.reason);
        res.json(result);
    }
    catch (error) {
        console.error('rescheduleBooking error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Cancel a booking
router.post('/api/bookings/:bookingId/cancel', async (req, res) => {
    try {
        const result = await BookingService_1.BookingService.cancelBooking(req.params.bookingId, req.body.reason);
        res.json(result);
    }
    catch (error) {
        console.error('cancelBooking error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update booking status (doctor/admin)
router.patch('/api/bookings/:bookingId/status', async (req, res) => {
    try {
        const result = await BookingService_1.BookingService.updateBookingStatus(req.params.bookingId, req.body.status, req.body.reason);
        res.json(result);
    }
    catch (error) {
        console.error('updateBookingStatus error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=bookings.js.map