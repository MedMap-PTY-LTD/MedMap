"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefundsRouter = void 0;
const express_1 = require("express");
const types_1 = require("../types");
const BookingService_1 = require("../services/BookingService");
const auth_1 = require("../middleware/auth");
const AccountCreditService_1 = require("../services/AccountCreditService");
function emitCancellation(io, bookingId, result, reason) {
    if (!result.bookingCancelled)
        return;
    const payload = { bookingId, status: 'cancelled', reason: reason || 'Cancelled with refund' };
    if (result.patientId)
        io.to(`patient_${result.patientId}`).emit(types_1.BookingEvents.BOOKING_CANCELLED, payload);
    if (result.doctorId)
        io.to(`doctor_${result.doctorId}`).emit(types_1.BookingEvents.BOOKING_CANCELLED, payload);
}
function createRefundsRouter(io) {
    const router = (0, express_1.Router)();
    router.use('/api/admin/refunds', auth_1.requireAuth, auth_1.requireAdmin);
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
            if (!result.success)
                return res.status(400).json({ error: result.error });
            emitCancellation(io, req.params.bookingId, result, 'Cancelled with refund');
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    router.post('/api/admin/refunds/:refundId/credit', async (req, res) => {
        try {
            const user = req.authUser;
            const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
            if (reason.length < 3 || reason.length > 1000) {
                return res.status(400).json({ error: 'Add a reason between 3 and 1000 characters' });
            }
            const result = await AccountCreditService_1.AccountCreditService.issueBookingRefundCredit({
                queueId: req.params.refundId,
                reason,
                adminUid: user.uid,
                adminEmail: user.email,
            });
            if (result.bookingId)
                emitCancellation(io, result.bookingId, result, reason);
            res.json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Could not credit this account' });
        }
    });
    router.post('/api/admin/refunds/:refundId/decline', async (req, res) => {
        try {
            const user = req.authUser;
            const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
            if (reason.length < 3 || reason.length > 1000) {
                return res.status(400).json({ error: 'Add a reason between 3 and 1000 characters' });
            }
            await AccountCreditService_1.AccountCreditService.declineBookingRefundReview({
                queueId: req.params.refundId,
                reason,
                adminUid: user.uid,
                adminEmail: user.email,
            });
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Could not close this refund review' });
        }
    });
    return router;
}
exports.createRefundsRouter = createRefundsRouter;
//# sourceMappingURL=refunds.js.map