// src/routes/refunds.ts
import { Router } from 'express';
import { BookingService } from '../services/BookingService';
import { requireAdmin, requireAuth } from '../middleware/auth';

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

export default router;
