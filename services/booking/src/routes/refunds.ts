// src/routes/refunds.ts
import { Router } from 'express';
import { BookingService } from '../services/BookingService';
import { requireAdmin, requireAuth, AuthedRequest } from '../middleware/auth';
import { AccountCreditService } from '../services/AccountCreditService';

const router = Router();
router.use('/api/admin/refunds', requireAuth, requireAdmin);

// Get all bookings awaiting manual PayFast refund
router.get('/api/admin/refunds/pending', async (req, res) => {
  try {
    const refunds = await BookingService.getPendingRefunds();
    res.json(refunds);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin marks a refund as done (after processing in PayFast dashboard)
router.post('/api/admin/refunds/:bookingId/complete', async (req, res) => {
  try {
    const { refundReference } = req.body;
    const result = await BookingService.markRefundProcessed(
      req.params.bookingId,
      refundReference
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/refunds/:refundId/credit', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 3 || reason.length > 1000) return res.status(400).json({ error: 'Add a reason between 3 and 1000 characters' });
    const result = await AccountCreditService.issueBookingRefundCredit({
      queueId: req.params.refundId,
      reason,
      adminUid: user.uid,
      adminEmail: user.email,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Could not credit this account' });
  }
});

router.post('/api/admin/refunds/:refundId/decline', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 3 || reason.length > 1000) return res.status(400).json({ error: 'Add a reason between 3 and 1000 characters' });
    await AccountCreditService.declineBookingRefundReview({
      queueId: req.params.refundId,
      reason,
      adminUid: user.uid,
      adminEmail: user.email,
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Could not close this refund review' });
  }
});

export default router;
