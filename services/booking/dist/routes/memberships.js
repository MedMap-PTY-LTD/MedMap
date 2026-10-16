"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PatientMembershipService_1 = require("../services/PatientMembershipService");
const DoctorMembershipService_1 = require("../services/DoctorMembershipService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use('/api/memberships/patient', auth_1.requireAuth);
router.get('/api/memberships/patient', async (req, res) => {
    try {
        const user = req.authUser;
        res.setHeader('Cache-Control', 'no-store');
        res.json(await PatientMembershipService_1.PatientMembershipService.getMembership(user.uid));
    }
    catch (error) {
        console.error('get patient membership error:', error);
        res.status(500).json({ error: 'Could not load patient membership' });
    }
});
router.get('/api/memberships/patient/booking-fee', async (req, res) => {
    try {
        const user = req.authUser;
        res.setHeader('Cache-Control', 'no-store');
        res.json(await PatientMembershipService_1.PatientMembershipService.getBookingEntitlement(user.uid));
    }
    catch (error) {
        console.error('get patient booking entitlement error:', error);
        res.status(500).json({ error: 'Could not load booking fee' });
    }
});
router.post('/api/memberships/patient/checkout', async (req, res) => {
    try {
        const user = req.authUser;
        const result = await PatientMembershipService_1.PatientMembershipService.createCheckout(user.uid, req.body?.planId);
        res.json(result);
    }
    catch (error) {
        console.error('create patient membership checkout error:', error);
        res.status(400).json({ error: error.message || 'Could not start membership checkout' });
    }
});
router.post('/api/memberships/patient/cancel-renewal', async (req, res) => {
    try {
        const user = req.authUser;
        res.json(await PatientMembershipService_1.PatientMembershipService.cancelRenewal(user.uid));
    }
    catch (error) {
        console.error('cancel patient membership renewal error:', error);
        res.status(400).json({ error: error.message || 'Could not cancel membership renewal' });
    }
});
router.post('/api/memberships/patient/downgrade', async (req, res) => {
    try {
        const user = req.authUser;
        res.json(await PatientMembershipService_1.PatientMembershipService.scheduleDowngrade(user.uid, req.body?.planId));
    }
    catch (error) {
        console.error('schedule patient membership downgrade error:', error);
        res.status(400).json({ error: error.message || 'Could not schedule membership downgrade' });
    }
});
router.use('/api/memberships/doctor', auth_1.requireAuth);
router.get('/api/memberships/doctor', async (req, res) => {
    try {
        const user = req.authUser;
        res.setHeader('Cache-Control', 'no-store');
        res.json(await DoctorMembershipService_1.DoctorMembershipService.getMembership(user.uid));
    }
    catch (error) {
        console.error('get provider membership error:', error);
        res.status(500).json({ error: 'Could not load provider membership' });
    }
});
router.post('/api/memberships/doctor/checkout', async (req, res) => {
    try {
        const user = req.authUser;
        const result = await DoctorMembershipService_1.DoctorMembershipService.createCheckout(user.uid, req.body?.planId);
        res.json(result);
    }
    catch (error) {
        console.error('create provider membership checkout error:', error);
        res.status(400).json({ error: error.message || 'Could not start membership checkout' });
    }
});
router.post('/api/memberships/doctor/cancel-renewal', async (req, res) => {
    try {
        const user = req.authUser;
        res.json(await DoctorMembershipService_1.DoctorMembershipService.cancelRenewal(user.uid));
    }
    catch (error) {
        console.error('cancel provider membership renewal error:', error);
        res.status(400).json({ error: error.message || 'Could not cancel membership renewal' });
    }
});
router.post('/api/memberships/doctor/downgrade', async (req, res) => {
    try {
        const user = req.authUser;
        res.json(await DoctorMembershipService_1.DoctorMembershipService.scheduleDowngrade(user.uid, req.body?.planId));
    }
    catch (error) {
        console.error('schedule provider membership downgrade error:', error);
        res.status(400).json({ error: error.message || 'Could not schedule membership downgrade' });
    }
});
exports.default = router;
//# sourceMappingURL=memberships.js.map