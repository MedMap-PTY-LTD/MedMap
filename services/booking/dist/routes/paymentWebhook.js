"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/bookings.ts
const express_1 = require("express");
const BookingService_1 = require("../services/BookingService");
const router = (0, express_1.Router)();
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=paymentWebhook.js.map