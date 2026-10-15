// src/routes/bookings.ts
import { Router } from 'express';
import { BookingService } from '../services/BookingService';

const router = Router();

// ==================== CREATE BOOKING + PAYFAST ====================

// 🔥 Create booking + return PayFast form HTML
router.post('/api/bookings/create-with-payment', async (req, res) => {
  try {
    const result = await BookingService.createBookingWithPayment({
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
  } catch (error: any) {
    console.error('create-with-payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== READ ====================

// Get a single booking by ID
router.get('/api/bookings/:bookingId', async (req, res) => {
  try {
    const booking = await BookingService.getBooking(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error: any) {
    console.error('getBooking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings for a patient
router.get('/api/bookings/patient/:patientId', async (req, res) => {
  try {
    const bookings = await BookingService.getPatientBookings(req.params.patientId);
    res.json(bookings);
  } catch (error: any) {
    console.error('getPatientBookings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings for a doctor (optional ?status=confirmed)
router.get('/api/bookings/doctor/:doctorId', async (req, res) => {
  try {
    const bookings = await BookingService.getDoctorBookings(
      req.params.doctorId,
      req.query.status as string | undefined
    );
    res.json(bookings);
  } catch (error: any) {
    console.error('getDoctorBookings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming bookings for a doctor
router.get('/api/bookings/doctor/:doctorId/upcoming', async (req, res) => {
  try {
    const bookings = await BookingService.getUpcomingBookings(req.params.doctorId);
    res.json(bookings);
  } catch (error: any) {
    console.error('getUpcomingBookings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get booking stats for a doctor
router.get('/api/bookings/doctor/:doctorId/stats', async (req, res) => {
  try {
    const stats = await BookingService.getBookingStats(req.params.doctorId);
    res.json(stats);
  } catch (error: any) {
    console.error('getBookingStats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SLOTS ====================

// Get available slots for a doctor on a date
router.get('/api/bookings/slots/:doctorId/:date', async (req, res) => {
  try {
    const slots = await BookingService.getAvailableSlots(
      req.params.doctorId,
      req.params.date
    );
    res.json(slots);
  } catch (error: any) {
    console.error('getAvailableSlots error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set day availability for a doctor
router.post('/api/bookings/slots/:doctorId/:date', async (req, res) => {
  try {
    const result = await BookingService.setDayAvailability(
      req.params.doctorId,
      req.params.date,
      req.body.slots || []
    );
    res.json(result);
  } catch (error: any) {
    console.error('setDayAvailability error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ACTIONS ====================

// Reschedule a booking
router.post('/api/bookings/:bookingId/reschedule', async (req, res) => {
  try {
    const result = await BookingService.rescheduleBooking(
      req.params.bookingId,
      req.body.newDate,
      req.body.newTime,
      req.body.reason
    );
    res.json(result);
  } catch (error: any) {
    console.error('rescheduleBooking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a booking
router.post('/api/bookings/:bookingId/cancel', async (req, res) => {
  try {
    const result = await BookingService.cancelBooking(
      req.params.bookingId,
      req.body.reason
    );
    res.json(result);
  } catch (error: any) {
    console.error('cancelBooking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update booking status (doctor/admin)
router.patch('/api/bookings/:bookingId/status', async (req, res) => {
  try {
    const result = await BookingService.updateBookingStatus(
      req.params.bookingId,
      req.body.status,
      req.body.reason
    );
    res.json(result);
  } catch (error: any) {
    console.error('updateBookingStatus error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;