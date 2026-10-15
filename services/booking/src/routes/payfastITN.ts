// src/routes/payfastITN.ts
import { Router } from 'express';
import { InvalidPayFastNotification, PaymentService } from '../services/PaymentService';

const router = Router();

// Operational status only: no booking IDs, payloads, addresses or credentials.
export const payfastNotificationHealth: { receivedAt?: string; outcome?: string } = {};

// IMPORTANT: PayFast sends application/x-www-form-urlencoded, not JSON
router.post(
  '/api/payments/payfast/notify',
  async (req, res) => {
    payfastNotificationHealth.receivedAt = new Date().toISOString();
    try {
      await PaymentService.handleITN(req.body, req.ip || '');
      payfastNotificationHealth.outcome = 'accepted';
      res.status(200).send('OK');
    } catch (error: any) {
      payfastNotificationHealth.outcome = error.message === 'Unexpected PayFast notification source' ? 'source_rejected'
        : error.message === 'PayFast rejected the notification' ? 'gateway_rejected'
        : error instanceof InvalidPayFastNotification ? 'notification_rejected' : 'processing_error';
      console.error('ITN route error:', error);
      res.status(error instanceof InvalidPayFastNotification ? 400 : 503).send('Payment notification not processed');
    }
  }
);

export default router;
