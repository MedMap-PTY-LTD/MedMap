// src/routes/payfastITN.ts
import express, { Router } from 'express';
import { PaymentService } from '../services/PaymentService';

const router = Router();

// IMPORTANT: PayFast sends application/x-www-form-urlencoded, not JSON
router.post(
  '/api/payments/payfast/notify',
  express.urlencoded({ extended: true }), // <- must parse form data
  async (req, res) => {
    try {
      const itnData = req.body; // Record<string, string>

      const result = await PaymentService.handleITN(itnData);

      if (result.success) {
        console.log('✅ ITN processed:', itnData.m_payment_id);
      } else {
        console.error('❌ ITN failed:', result.error);
      }

      // ALWAYS return 200 — PayFast retries on non-2xx responses
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('ITN route error:', error);
      res.status(200).send('OK'); // Still 200 to stop retry storms
    }
  }
);

export default router;