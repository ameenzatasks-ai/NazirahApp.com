import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string | null;
    avatar_url: string | null;
    google_id: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.nazirah_token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as { id: number };
    const user = db
      .prepare('SELECT id, google_id, name, email, avatar_url, role FROM users WHERE id = ?')
      .get(payload.id) as AuthRequest['user'] | undefined;

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: 'ustadh' | 'student') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: `Access restricted to ${role} role` });
      return;
    }
    next();
  };
}

export function issueToken(userId: number): string {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign({ id: userId }, secret, { expiresIn: '30d' });
}

export function setTokenCookie(res: Response, token: string): void {
  res.cookie('nazirah_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}
