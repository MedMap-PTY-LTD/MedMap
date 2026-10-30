import { Router } from 'express';
import { db } from '../config/firebase';
import { AuthedRequest, requireAuth } from '../middleware/auth';

const router = Router();

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
}

router.post('/api/admin/ambassadors/:ambassadorId/referral-code-email', requireAuth, async (req, res) => {
  try {
    const admin = (req as AuthedRequest).authUser!;
    const [adminRecord, adminProfile] = await Promise.all([
      db.collection('admins').doc(admin.uid).get(),
      db.collection('users').doc(admin.uid).get(),
    ]);

    if (!adminRecord.exists || adminProfile.data()?.role !== 'admin' || adminProfile.data()?.isActive === false) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const ambassadorId = String(req.params.ambassadorId || '').trim();
    if (!ambassadorId || ambassadorId.includes('/')) {
      return res.status(400).json({ error: 'A valid ambassador account is required.' });
    }

    const [ambassadorSnapshot, userSnapshot] = await Promise.all([
      db.collection('ambassadors').doc(ambassadorId).get(),
      db.collection('users').doc(ambassadorId).get(),
    ]);

    if (!ambassadorSnapshot.exists || !userSnapshot.exists) {
      return res.status(404).json({ error: 'Ambassador account not found.' });
    }

    const ambassador = ambassadorSnapshot.data()!;
    const user = userSnapshot.data()!;
    if (user.role !== 'ambassador' || ambassador.applicationStatus !== 'approved') {
      return res.status(409).json({ error: 'Only approved ambassadors can receive a referral code email.' });
    }

    const referralCode = typeof ambassador.referralCode === 'string' ? ambassador.referralCode.trim() : '';
    const email = typeof user.email === 'string' ? user.email.trim() : '';
    if (!referralCode) {
      return res.status(409).json({ error: 'This ambassador does not have a referral code yet.' });
    }
    if (!email) {
      return res.status(409).json({ error: 'This ambassador account does not have an email address.' });
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.AMBASSADOR_EMAIL_FROM?.trim()
      || process.env.MEMBERSHIP_EMAIL_FROM?.trim()
      || process.env.PASSWORD_RESET_EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      console.error('Ambassador referral email is not configured: Resend key and sender are required');
      return res.status(503).json({ error: 'Referral emails are not configured on the server.' });
    }

    const frontendOrigin = process.env.FRONTEND_URL?.trim()
      || process.env.CLIENT_URL?.split(',')[0]?.trim()
      || 'https://medmap.co.za';
    const referralUrl = new URL('/doctor-enrollment', frontendOrigin);
    referralUrl.searchParams.set('ref', referralCode);

    const firstName = typeof user.firstName === 'string' && user.firstName.trim()
      ? user.firstName.trim()
      : 'there';
    const safeFirstName = escapeHtml(firstName);
    const safeReferralCode = escapeHtml(referralCode);
    const safeReferralUrl = escapeHtml(referralUrl.toString());
    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Your MedMap ambassador referral code',
        text: `Hi ${firstName},\n\nYour MedMap ambassador application has been approved. Your referral code is ${referralCode}.\n\nShare this link with doctors who want to join MedMap: ${referralUrl}\n\nYou can also find your code in the Ambassador Portal.`,
        html: `<p>Hi ${safeFirstName},</p><p>Your MedMap ambassador application has been approved. Your referral code is <strong>${safeReferralCode}</strong>.</p><p>Share this link with doctors who want to join MedMap: <a href="${safeReferralUrl}">Join MedMap</a></p><p>You can also find your code in the Ambassador Portal.</p>`,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!delivery.ok) {
      console.error(`Ambassador referral email delivery failed with status ${delivery.status}`);
      return res.status(502).json({ error: 'The referral email could not be delivered. Please try again.' });
    }

    return res.json({ success: true, email });
  } catch (error: any) {
    console.error('Ambassador referral email request failed:', error?.message || 'Unknown error');
    return res.status(500).json({ error: 'The referral email could not be sent. Please try again.' });
  }
});

export default router;
