// src/routes/payfastITN.ts
import { Router, Request } from 'express';
import { isIP } from 'net';
import { InvalidPayFastNotification, PaymentService } from '../services/PaymentService';
import { PatientMembershipService } from '../services/PatientMembershipService';
import { DoctorMembershipService } from '../services/DoctorMembershipService';

const router = Router();

// Operational status only: no booking IDs, payloads, addresses or credentials.
export const payfastNotificationHealth: { receivedAt?: string; outcome?: string } = {};

export function notificationSource(req: Request): string {
  // Render's public ingress passes through Cloudflare and multiple load balancers.
  // Cloudflare overwrites this header; never use client-supplied X-Forwarded-For.
  if (process.env.RENDER === 'true') {
    const originalIp = req.get('cf-connecting-ip');
    if (originalIp && isIP(originalIp)) return originalIp;
    return ''; // Fail closed when the managed ingress header is missing.
  }
  return req.ip || '';
}

// The browser needs only the current payment mode and booking fee to present
// accurate checkout text. Merchant credentials are never returned here.
router.get('/api/payments/payfast/config', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(PaymentService.publicConfig());
  } catch (error) {
    console.error('PayFast public config unavailable:', error);
    res.status(503).json({ error: 'PayFast is temporarily unavailable' });
  }
});

// IMPORTANT: PayFast sends application/x-www-form-urlencoded, not JSON
router.post(
  '/api/payments/payfast/notify',
  async (req, res) => {
    payfastNotificationHealth.receivedAt = new Date().toISOString();
    try {
      const payload = req.body || {};
      const paymentReference = typeof payload.m_payment_id === 'string' ? payload.m_payment_id : '';
      const token = typeof payload.token === 'string' ? payload.token : '';
      const doctorMembershipNotification = paymentReference.startsWith('pfd_') ||
        (!paymentReference.startsWith('pfm_') && !!token && await DoctorMembershipService.hasSubscriptionToken(token));
      const patientMembershipNotification = paymentReference.startsWith('pfm_') || !!token;
      if (doctorMembershipNotification) {
        await DoctorMembershipService.handleITN(payload, notificationSource(req));
      } else if (patientMembershipNotification) {
        await PatientMembershipService.handleITN(payload, notificationSource(req));
      } else {
        await PaymentService.handleITN(payload, notificationSource(req));
      }
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
