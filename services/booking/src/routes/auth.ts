import { Request, Router } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { app } from '../config/firebase';

const router = Router();
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_REQUESTS_PER_IP = 5;
const resetRequests = new Map<string, { count: number; resetAt: number }>();
let requestsSinceCleanup = 0;

const genericResponse = {
  message: 'If an account exists for that email, password reset instructions will be sent.',
};

function isRateLimited(req: Request): boolean {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';

  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 1000) {
    requestsSinceCleanup = 0;
    for (const [requestKey, bucket] of resetRequests) {
      if (bucket.resetAt <= now) resetRequests.delete(requestKey);
    }
  }

  const current = resetRequests.get(key);

  if (!current || current.resetAt <= now) {
    resetRequests.set(key, { count: 1, resetAt: now + RESET_WINDOW_MS });
    return false;
  }

  if (current.count >= RESET_REQUESTS_PER_IP) return true;
  current.count += 1;

  return false;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
}

function getSignInUrl(): string {
  const configuredOrigin = process.env.FRONTEND_URL?.trim()
    || process.env.CLIENT_URL?.split(',')[0]?.trim()
    || 'https://medmap.co.za';
  const origin = new URL(configuredOrigin);
  if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') {
    throw new Error('Password reset frontend URL must use HTTPS');
  }
  return new URL('/signin', origin).toString();
}

router.post('/api/auth/forgot-password', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many reset requests. Please wait before trying again.' });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PASSWORD_RESET_EMAIL_FROM?.trim() || process.env.MEMBERSHIP_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    console.error('Password reset email is not configured: RESEND_API_KEY and an email sender are required');
    return res.status(503).json({ error: 'Password reset is temporarily unavailable. Please try again later.' });
  }

  try {
    const auth = getAuth(app);
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') return res.status(202).json(genericResponse);
      throw error;
    }

    const canResetPassword = !user.disabled && user.providerData.some(provider => provider.providerId === 'password');
    if (!canResetPassword) return res.status(202).json(genericResponse);

    const resetLink = await auth.generatePasswordResetLink(user.email || email, {
      url: getSignInUrl(),
      handleCodeInApp: false,
    });
    const safeResetLink = escapeHtml(resetLink);
    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [user.email || email],
        subject: 'Reset your MedMap password',
        text: `We received a request to reset your MedMap password. Use this link to choose a new password:\n\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>We received a request to reset your MedMap password.</p><p><a href="${safeResetLink}">Choose a new password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!delivery.ok) {
      console.error(`Password reset email delivery failed with status ${delivery.status}`);
      return res.status(202).json(genericResponse);
    }

    return res.status(202).json(genericResponse);
  } catch (error: any) {
    console.error('Password reset request failed:', error?.message || 'Unknown error');
    return res.status(202).json(genericResponse);
  }
});

export default router;
