"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationSource = exports.payfastNotificationHealth = void 0;
// src/routes/payfastITN.ts
const express_1 = require("express");
const net_1 = require("net");
const PaymentService_1 = require("../services/PaymentService");
const PatientMembershipService_1 = require("../services/PatientMembershipService");
const DoctorMembershipService_1 = require("../services/DoctorMembershipService");
const router = (0, express_1.Router)();
// Operational status only: no booking IDs, payloads, addresses or credentials.
exports.payfastNotificationHealth = {};
function notificationSource(req) {
    // Render's public ingress passes through Cloudflare and multiple load balancers.
    // Cloudflare overwrites this header; never use client-supplied X-Forwarded-For.
    if (process.env.RENDER === 'true') {
        const originalIp = req.get('cf-connecting-ip');
        if (originalIp && (0, net_1.isIP)(originalIp))
            return originalIp;
        return ''; // Fail closed when the managed ingress header is missing.
    }
    return req.ip || '';
}
exports.notificationSource = notificationSource;
// The browser needs only the current payment mode and booking fee to present
// accurate checkout text. Merchant credentials are never returned here.
router.get('/api/payments/payfast/config', (_req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store');
        res.json(PaymentService_1.PaymentService.publicConfig());
    }
    catch (error) {
        console.error('PayFast public config unavailable:', error);
        res.status(503).json({ error: 'PayFast is temporarily unavailable' });
    }
});
// IMPORTANT: PayFast sends application/x-www-form-urlencoded, not JSON
router.post('/api/payments/payfast/notify', async (req, res) => {
    exports.payfastNotificationHealth.receivedAt = new Date().toISOString();
    try {
        const payload = req.body || {};
        const paymentReference = typeof payload.m_payment_id === 'string' ? payload.m_payment_id : '';
        const token = typeof payload.token === 'string' ? payload.token : '';
        const doctorMembershipNotification = paymentReference.startsWith('pfd_') ||
            (!paymentReference.startsWith('pfm_') && !!token && await DoctorMembershipService_1.DoctorMembershipService.hasSubscriptionToken(token));
        const patientMembershipNotification = paymentReference.startsWith('pfm_') || !!token;
        if (doctorMembershipNotification) {
            await DoctorMembershipService_1.DoctorMembershipService.handleITN(payload, notificationSource(req));
        }
        else if (patientMembershipNotification) {
            await PatientMembershipService_1.PatientMembershipService.handleITN(payload, notificationSource(req));
        }
        else {
            await PaymentService_1.PaymentService.handleITN(payload, notificationSource(req));
        }
        exports.payfastNotificationHealth.outcome = 'accepted';
        res.status(200).send('OK');
    }
    catch (error) {
        exports.payfastNotificationHealth.outcome = error.message === 'Unexpected PayFast notification source' ? 'source_rejected'
            : error.message === 'PayFast rejected the notification' ? 'gateway_rejected'
                : error instanceof PaymentService_1.InvalidPayFastNotification ? 'notification_rejected' : 'processing_error';
        console.error('ITN route error:', error);
        res.status(error instanceof PaymentService_1.InvalidPayFastNotification ? 400 : 503).send('Payment notification not processed');
    }
});
exports.default = router;
//# sourceMappingURL=payfastITN.js.map