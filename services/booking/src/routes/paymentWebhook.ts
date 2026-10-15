// src/routes/bookings.ts
import { Router } from 'express';
import { BookingService } from '../services/BookingService';

const router = Router();

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
      // BookingService fills the rest
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
    res.status(500).json({ error: error.message });
  }
});

export default router;