import { Router, Request, Response } from 'express';
import passport from 'passport';
import { z } from 'zod';
import db from '../db';
import { authenticate, AuthRequest, issueToken, setTokenCookie } from './middleware';
// `db` is still used elsewhere in this file (PATCH /role), so the import stays.

const router = Router();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ── Google OAuth ───────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_ORIGIN}/welcome` }),
  (req: Request, res: Response): void => {
    const user = req.user as any;
    if (!user) {
      res.redirect(`${CLIENT_ORIGIN}/welcome`);
      return;
    }
    const token = issueToken(user.id);
    setTokenCookie(res, token);
    res.redirect(`${CLIENT_ORIGIN}/auth/callback`);
  }
);

// ── Current user ───────────────────────────────────────────────
router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

// ── Set role (first login only) ───────────────────────────────
router.patch('/role', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role) {
    res.status(403).json({ error: 'Role already set and cannot be changed' });
    return;
  }

  const parsed = z.object({ role: z.enum(['student', 'ustadh']) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'role must be "student" or "ustadh"' });
    return;
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(parsed.data.role, user.id);
  const updated = db
    .prepare('SELECT id, google_id, name, email, avatar_url, role, created_at FROM users WHERE id = ?')
    .get(user.id);

  res.json({ user: updated });
});

// ── Logout ─────────────────────────────────────────────────────
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('nazirah_token');
  res.json({ success: true });
});

export default router;
