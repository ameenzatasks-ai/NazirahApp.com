import { Router, Request, Response } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db';
import { authenticate, AuthRequest, issueToken, setTokenCookie } from './middleware';

const router = Router();
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');

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

// ── Username/password register ─────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = z.object({
    name:     z.string().min(1).max(50).trim(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const { name, username, password } = parsed.data;
  const usernameLower = username.toLowerCase();

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(usernameLower);
  if (existing) {
    res.status(409).json({ error: 'Username is already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db
    .prepare('INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), usernameLower, passwordHash);

  const user = await db
    .prepare('SELECT id, google_id, name, email, username, avatar_url, role, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  const token = issueToken((user as any).id);
  setTokenCookie(res, token);
  res.status(201).json({ user });
});

// ── Username/password login ─────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = z.object({
    username: z.string(),
    password: z.string(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const { username, password } = parsed.data;
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase()) as any;

  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Incorrect username or password' });
    return;
  }

  const token = issueToken(user.id);
  setTokenCookie(res, token);
  const { password_hash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ── Current user ───────────────────────────────────────────────
router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

// ── Set role (first login only) ───────────────────────────────
router.patch('/role', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

  await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(parsed.data.role, user.id);
  const updated = await db
    .prepare('SELECT id, google_id, name, email, username, avatar_url, role, created_at FROM users WHERE id = ?')
    .get(user.id);

  res.json({ user: updated });
});

// ── Logout ─────────────────────────────────────────────────────
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('nazirah_token');
  res.json({ success: true });
});

export default router;
