import { Router } from 'express';
import { PatientMembershipService } from '../services/PatientMembershipService';
import { DoctorMembershipService } from '../services/DoctorMembershipService';
import { AuthedRequest, requireAuth } from '../middleware/auth';

const router = Router();
router.use('/api/memberships/patient', requireAuth);

router.get('/api/memberships/patient', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    res.setHeader('Cache-Control', 'no-store');
    res.json(await PatientMembershipService.getMembership(user.uid));
  } catch (error: any) {
    console.error('get patient membership error:', error);
    res.status(500).json({ error: 'Could not load patient membership' });
  }
});

router.get('/api/memberships/patient/booking-fee', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    res.setHeader('Cache-Control', 'no-store');
    res.json(await PatientMembershipService.getBookingEntitlement(user.uid));
  } catch (error: any) {
    console.error('get patient booking entitlement error:', error);
    res.status(500).json({ error: 'Could not load booking fee' });
  }
});

router.post('/api/memberships/patient/checkout', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    const result = await PatientMembershipService.createCheckout(user.uid, req.body?.planId);
    res.json(result);
  } catch (error: any) {
    console.error('create patient membership checkout error:', error);
    res.status(400).json({ error: error.message || 'Could not start membership checkout' });
  }
});

router.post('/api/memberships/patient/cancel-renewal', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    res.json(await PatientMembershipService.cancelRenewal(user.uid));
  } catch (error: any) {
    console.error('cancel patient membership renewal error:', error);
    res.status(400).json({ error: error.message || 'Could not cancel membership renewal' });
  }
});

router.post('/api/memberships/patient/downgrade', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    res.json(await PatientMembershipService.scheduleDowngrade(user.uid, req.body?.planId));
  } catch (error: any) {
    console.error('schedule patient membership downgrade error:', error);
    res.status(400).json({ error: error.message || 'Could not schedule membership downgrade' });
  }
});

router.use('/api/memberships/doctor', requireAuth);

router.get('/api/memberships/doctor', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    res.setHeader('Cache-Control', 'no-store');
    res.json(await DoctorMembershipService.getMembership(user.uid));
  } catch (error: any) {
    console.error('get provider membership error:', error);
    res.status(500).json({ error: 'Could not load provider membership' });
  }
});

router.post('/api/memberships/doctor/checkout', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    const result = await DoctorMembershipService.createCheckout(user.uid, req.body?.planId);
    res.json(result);
  } catch (error: any) {
    console.error('create provider membership checkout error:', error);
    res.status(400).json({ error: error.message || 'Could not start membership checkout' });
  }
});

router.post('/api/memberships/doctor/cancel-renewal', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    res.json(await DoctorMembershipService.cancelRenewal(user.uid));
  } catch (error: any) {
    console.error('cancel provider membership renewal error:', error);
    res.status(400).json({ error: error.message || 'Could not cancel membership renewal' });
  }
});

router.post('/api/memberships/doctor/downgrade', async (req, res) => {
  try {
    const user = (req as AuthedRequest).authUser!;
    res.json(await DoctorMembershipService.scheduleDowngrade(user.uid, req.body?.planId));
  } catch (error: any) {
    console.error('schedule provider membership downgrade error:', error);
    res.status(400).json({ error: error.message || 'Could not schedule membership downgrade' });
  }
});

export default router;
