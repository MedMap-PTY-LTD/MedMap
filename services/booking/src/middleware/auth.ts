import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { app } from '../config/firebase';

export interface AuthUser {
  uid: string;
  admin: boolean;
  email: string;
}

export interface AuthedRequest extends Request {
  authUser?: AuthUser;
}

export async function authenticateToken(token: string): Promise<AuthUser> {
  if (!token) throw new Error('Authentication required');
  const decoded = await getAuth(app).verifyIdToken(token);
  return { uid: decoded.uid, admin: decoded.admin === true, email: decoded.email || '' };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const match = /^Bearer (.+)$/.exec(req.header('Authorization') || '');
    req.authUser = await authenticateToken(match?.[1] || '');
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser?.admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
