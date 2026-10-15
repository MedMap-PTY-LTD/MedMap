"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/refunds.ts
const express_1 = require("express");
const BookingService_1 = require("../services/BookingService");
const router = (0, express_1.Router)();
// Get all bookings awaiting manual PayFast refund
router.get('/api/admin/refunds/pending', async (req, res) => {
    try {
        const refunds = await BookingService_1.BookingService.getPendingRefunds();
        res.json(refunds);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Admin marks a refund as done (after processing in PayFast dashboard)
router.post('/api/admin/refunds/:bookingId/complete', async (req, res) => {
    try {
        const { refundReference } = req.body;
        const result = await BookingService_1.BookingService.markRefundProcessed(req.params.bookingId, refundReference);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=refunds.js.map