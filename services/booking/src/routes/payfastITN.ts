// src/routes/payfastITN.ts
import { Router } from 'express';
import { InvalidPayFastNotification, PaymentService } from '../services/PaymentService';

const router = Router();

// IMPORTANT: PayFast sends application/x-www-form-urlencoded, not JSON
router.post(
  '/api/payments/payfast/notify',
  async (req, res) => {
    try {
      await PaymentService.handleITN(req.body, req.ip || '');
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('ITN route error:', error);
      res.status(error instanceof InvalidPayFastNotification ? 400 : 503).send('Payment notification not processed');
    }
  }
);

export default router;
