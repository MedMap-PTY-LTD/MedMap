"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("firebase-admin/auth");
const firebase_1 = require("../config/firebase");
const auth_2 = require("../middleware/auth");
const AccountCreditService_1 = require("../services/AccountCreditService");
const router = (0, express_1.Router)();
router.get('/api/account-credit', auth_2.requireAuth, async (req, res) => {
    try {
        const user = req.authUser;
        res.json(await AccountCreditService_1.AccountCreditService.getSummary(user.uid));
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Could not load account credit' });
    }
});
router.use('/api/admin/account-credits', auth_2.requireAuth, auth_2.requireAdmin);
router.get('/api/admin/account-credits/lookup', async (req, res) => {
    try {
        const email = String(req.query.email || '').trim().toLowerCase();
        if (!email || email.length > 254 || !email.includes('@')) {
            return res.status(400).json({ error: 'Enter a valid patient email address' });
        }
        const authUser = await (0, auth_1.getAuth)(firebase_1.app).getUserByEmail(email);
        const profile = await firebase_1.db.collection('users').doc(authUser.uid).get();
        if (!profile.exists || profile.data()?.role !== 'patient') {
            return res.status(404).json({ error: 'No patient account found for that email' });
        }
        const data = profile.data();
        const account = await AccountCreditService_1.AccountCreditService.getSummary(authUser.uid);
        res.json({
            user: {
                uid: authUser.uid,
                email: authUser.email || email,
                fullName: data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Patient',
            },
            ...account,
        });
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'No patient account found for that email' });
        }
        res.status(500).json({ error: error.message || 'Could not look up patient account' });
    }
});
router.post('/api/admin/account-credits/:userId', async (req, res) => {
    try {
        const user = req.authUser;
        const amount = typeof req.body?.amount === 'number' ? String(req.body.amount) : String(req.body?.amount || '').trim();
        if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
            return res.status(400).json({ error: 'Enter an amount with up to two decimal places' });
        }
        const amountCents = Math.round(Number(amount) * 100);
        if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
            return res.status(400).json({ error: 'Credit amount must be greater than zero' });
        }
        const kind = req.body?.kind;
        if (kind !== 'refund' && kind !== 'compensation') {
            return res.status(400).json({ error: 'Choose refund or compensation' });
        }
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
        if (reason.length < 3 || reason.length > 1000) {
            return res.status(400).json({ error: 'Add a reason between 3 and 1000 characters' });
        }
        const source = typeof req.body?.source === 'string' ? req.body.source.trim().slice(0, 200) : '';
        const patient = await firebase_1.db.collection('users').doc(req.params.userId).get();
        if (!patient.exists || patient.data()?.role !== 'patient') {
            return res.status(404).json({ error: 'Patient account not found' });
        }
        const result = await AccountCreditService_1.AccountCreditService.issueAdminCredit({
            userId: req.params.userId,
            amountCents,
            kind: kind === 'refund' ? 'admin_refund' : 'admin_compensation',
            reason,
            source: source || undefined,
            adminUid: user.uid,
            adminEmail: user.email,
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Could not issue account credit' });
    }
});
exports.default = router;
//# sourceMappingURL=accountCredits.js.map