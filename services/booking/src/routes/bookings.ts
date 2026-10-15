// src/routes/bookings.ts
import { Router } from 'express';
import { BookingService } from '../services/BookingService';
import { PaymentService } from '../services/PaymentService';
import { db } from '../config/firebase';
import { AuthedRequest, requireAuth } from '../middleware/auth';

const router = Router();
router.use('/api/bookings', requireAuth);

// ==================== CREATE BOOKING + PAYFAST ====================

// 🔥 Create booking + return PayFast form HTML
router.post('/api/bookings/create-with-payment', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    const body = req.body || {};
    const paymentMode = PaymentService.currentMode();
    if (paymentMode === 'sandbox' && body.sandboxTest !== true) {
      return res.status(400).json({ error: 'Sandbox checkout requires an explicit test booking' });
    }
    if (paymentMode === 'live' && body.sandboxTest === true) {
      return res.status(400).json({ error: 'Sandbox test bookings cannot be created in live mode' });
    }
    if (typeof body.doctorId !== 'string' || typeof body.appointmentDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(body.appointmentDate) ||
        !/^\d{2}:\d{2}$/.test(body.appointmentTime || '')) {
      return res.status(400).json({ error: 'Doctor, date and time are required' });
    }
    const [patientSnap, doctorSnap, doctorUserSnap] = await Promise.all([
      db.collection('users').doc(user.uid).get(),
      db.collection('doctors').doc(body.doctorId).get(),
      db.collection('users').doc(body.doctorId).get(),
    ]);
    if (!patientSnap.exists || !doctorSnap.exists) {
      return res.status(400).json({ error: 'Patient or doctor not found' });
    }
    const patient = patientSnap.data()!;
    const doctor = doctorSnap.data()!;
    const doctorUser = doctorUserSnap.data() || {};
    if (patient.isActive === false || doctor.verificationStatus !== 'verified') {
      return res.status(400).json({ error: 'Patient or doctor is unavailable' });
    }
    const duration = Number(doctor.consultationDuration) || 30;
    const [hours, minutes] = body.appointmentTime.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59 ||
        duration < 1 || duration > 240) {
      return res.status(400).json({ error: 'Invalid appointment time' });
    }
    const appointment = new Date(`${body.appointmentDate}T${body.appointmentTime}:00+02:00`);
    if (Number.isNaN(appointment.getTime()) || appointment.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Select a future appointment' });
    }
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    const result = await BookingService.createBookingWithPayment({
      doctorId: body.doctorId,
      patientId: user.uid,
      patientName: patient.fullName || 'Patient',
      patientEmail: user.email,
      patientPhone: patient.phone || '',
      doctorName: doctorUser.fullName || doctor.fullName || 'Doctor',
      doctorSpecialization: doctor.specialization || '',
      appointmentDate: body.appointmentDate,
      appointmentTime: body.appointmentTime,
      endTime,
      consultationFee: Number(doctor.consultationFee) || 0,
      notes: paymentMode === 'sandbox'
        ? '[PAYFAST SANDBOX TEST - NO REAL CONSULTATION] ' + (typeof body.notes === 'string' ? body.notes.trim().slice(0, 1900) : '')
        : (typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''),
    });

    if (result.error) {
      return res.status(400).json({ error: result.error, bookingId: result.bookingId });
    }

    res.json({
      bookingId: result.bookingId,
      checkout: result.checkout,
    });
  } catch (error: any) {
    console.error('create-with-payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/bookings/:bookingId/payfast-checkout', async (req, res) => {
  try {
    const booking = await BookingService.getBooking(req.params.bookingId);
    const user = (req as AuthedRequest).authUser!;
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.patientId !== user.uid && !user.admin) return res.status(403).json({ error: 'Forbidden' });
    const checkout = await PaymentService.createPaymentIntent(booking.id);
    res.json({ bookingId: booking.id, checkout });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    const user = (req as AuthedRequest).authUser!;
    if (![booking.patientId, booking.doctorId].includes(user.uid) && !user.admin) {
      return res.status(403).json({ error: 'Forbidden' });
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
    const user = (req as AuthedRequest).authUser!;
    if (req.params.patientId !== user.uid && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
    const user = (req as AuthedRequest).authUser!;
    if (req.params.doctorId !== user.uid && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
    const user = (req as AuthedRequest).authUser!;
    if (req.params.doctorId !== user.uid && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
    const user = (req as AuthedRequest).authUser!;
    if (req.params.doctorId !== user.uid && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
    const user = (req as AuthedRequest).authUser!;
    if (req.params.doctorId !== user.uid && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
    const booking = await BookingService.getBooking(req.params.bookingId);
    const user = (req as AuthedRequest).authUser!;
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (![booking.patientId, booking.doctorId].includes(user.uid) && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
    const booking = await BookingService.getBooking(req.params.bookingId);
    const user = (req as AuthedRequest).authUser!;
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (![booking.patientId, booking.doctorId].includes(user.uid) && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
    const booking = await BookingService.getBooking(req.params.bookingId);
    const user = (req as AuthedRequest).authUser!;
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.doctorId !== user.uid && !user.admin) return res.status(403).json({ error: 'Forbidden' });
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
