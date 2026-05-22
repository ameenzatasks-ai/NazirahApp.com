import { Router, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { authenticate, requireRole, AuthRequest } from '../auth/middleware';

const router = Router();

const pageSchema = z.object({
  pageNumber: z.number().int().min(1).max(604),
});

// GET /api/pages — page numbers this student has listened to
router.get('/', authenticate, requireRole('student'), (req: AuthRequest, res: Response): void => {
  const rows = db
    .prepare('SELECT page_number, last_read_at FROM page_reads WHERE student_id = ? AND read_count >= 1 ORDER BY page_number ASC')
    .all(req.user!.id) as Array<{ page_number: number; last_read_at: string }>;

  res.json({
    listenedPages: rows.map(r => ({ pageNumber: r.page_number, listenedAt: r.last_read_at })),
    total: rows.length,
  });
});

// PUT /api/pages/:pageNumber — mark page as listened (idempotent)
router.put('/:pageNumber', authenticate, requireRole('student'), (req: AuthRequest, res: Response): void => {
  const pageNumber = parseInt(req.params.pageNumber, 10);
  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    res.status(400).json({ error: 'Page number must be 1–604' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO page_reads (student_id, page_number, read_count, last_read_at, updated_at)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(student_id, page_number) DO UPDATE SET
      read_count   = MAX(read_count, 1),
      last_read_at = CASE WHEN read_count = 0 THEN excluded.last_read_at ELSE last_read_at END,
      updated_at   = excluded.updated_at
  `).run(req.user!.id, pageNumber, now, now);

  res.json({ pageNumber, listened: true, listenedAt: now });
});

// DELETE /api/pages/:pageNumber — unmark page as listened
router.delete('/:pageNumber', authenticate, requireRole('student'), (req: AuthRequest, res: Response): void => {
  const pageNumber = parseInt(req.params.pageNumber, 10);
  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    res.status(400).json({ error: 'Page number must be 1–604' });
    return;
  }

  db.prepare('DELETE FROM page_reads WHERE student_id = ? AND page_number = ?')
    .run(req.user!.id, pageNumber);

  res.json({ pageNumber, listened: false });
});

export default router;
