/**
 * Hifz tracking router — page-level status, Juz grid, and audit timeline.
 *
 * ALL db.prepare() calls are at module level (compiled once at startup) so
 * they are never called inside a transaction, eliminating the internal-server-
 * error that occurred when better-sqlite3 prepared statements were created mid-
 * transaction.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { authenticate, AuthRequest } from '../auth/middleware';
import { getJuz, type PageStatus } from '../../../shared/juz-map';

const router = Router();

const VALID_STATUSES = ['BLACK', 'RED', 'AMBER', 'YELLOW', 'GREEN', 'GOLD'] as const;
const statusSchema = z.enum(VALID_STATUSES);

// ── Module-level prepared statements ───────────────────────────────────────

const stmtTeaches = db.prepare(`
  SELECT 1 FROM enrolments e
  JOIN classes c ON c.id = e.class_id
  WHERE c.ustadh_id = ? AND e.student_id = ?
  LIMIT 1
`);

const stmtJuzPages = db.prepare(`
  SELECT page_number, status
  FROM student_page_status
  WHERE student_id = ? AND variant = 'NEW_MADANI'
    AND page_number BETWEEN ? AND ?
`);

const stmtGetPageStatus = db.prepare(`
  SELECT status FROM student_page_status
  WHERE student_id = ? AND variant = 'NEW_MADANI' AND page_number = ?
`);

const stmtUpsertPage = db.prepare(`
  INSERT INTO student_page_status
    (student_id, variant, page_number, status, set_by_user_id)
  VALUES (?, 'NEW_MADANI', ?, ?, ?)
  ON CONFLICT(student_id, variant, page_number)
  DO UPDATE SET status         = excluded.status,
                set_by_user_id = excluded.set_by_user_id,
                updated_at     = datetime('now')
`);

const stmtDeletePage = db.prepare(`
  DELETE FROM student_page_status
  WHERE student_id = ? AND variant = 'NEW_MADANI' AND page_number = ?
`);

const stmtInsertHistory = db.prepare(`
  INSERT INTO status_history
    (student_id, variant, page_number, from_status, to_status, changed_by, note)
  VALUES (?, 'NEW_MADANI', ?, ?, ?, ?, ?)
`);

const stmtAllPages = db.prepare(`
  SELECT page_number, status
  FROM student_page_status
  WHERE student_id = ? AND variant = 'NEW_MADANI'
  ORDER BY page_number ASC
`);

const stmtSummary = db.prepare(`
  SELECT status, COUNT(*) AS c
  FROM student_page_status
  WHERE student_id = ? AND variant = 'NEW_MADANI'
  GROUP BY status
`);

// ── Helpers ────────────────────────────────────────────────────────────────

function ustadhTeaches(ustadhId: number, studentId: number): boolean {
  return !!stmtTeaches.get(ustadhId, studentId);
}

function buildJuzGrid(studentId: number, juzNumber: number) {
  const juz = getJuz(juzNumber);
  if (!juz) return null;

  const rows = stmtJuzPages.all(studentId, juz.startPage, juz.endPage) as
    Array<{ page_number: number; status: PageStatus }>;

  const byPage = new Map<number, PageStatus>();
  for (const r of rows) byPage.set(r.page_number, r.status);

  const pages = [];
  for (let p = juz.startPage; p <= juz.endPage; p++) {
    pages.push({ pageNumber: p, status: byPage.get(p) ?? null });
  }

  return { juz: juzNumber, startPage: juz.startPage, endPage: juz.endPage, startSurah: juz.startSurah, pages };
}

/** Transaction that atomically writes the page status + history row. */
const setPageTx = db.transaction((
  setterId: number,
  targetStudentId: number,
  pageNumber: number,
  newStatus: PageStatus | null,
  fromStatus: PageStatus | null,
  note: string | null,
) => {
  if (newStatus === null) {
    stmtDeletePage.run(targetStudentId, pageNumber);
  } else {
    stmtUpsertPage.run(targetStudentId, pageNumber, newStatus, setterId);
  }
  stmtInsertHistory.run(targetStudentId, pageNumber, fromStatus, newStatus, setterId, note);
});

function setPageStatus(
  setterId: number,
  targetStudentId: number,
  pageNumber: number,
  newStatus: PageStatus | null,
  note?: string,
) {
  const existing = stmtGetPageStatus.get(targetStudentId, pageNumber) as
    { status: PageStatus } | undefined;
  const fromStatus = existing?.status ?? null;

  if (fromStatus === newStatus) return { unchanged: true, status: newStatus };

  setPageTx(setterId, targetStudentId, pageNumber, newStatus, fromStatus, note ?? null);

  return { unchanged: false, status: newStatus, fromStatus };
}

function buildSummary(studentId: number) {
  const counts = stmtSummary.all(studentId) as Array<{ status: PageStatus; c: number }>;
  const out: Record<PageStatus, number> & { UNTOUCHED: number } = {
    BLACK: 0, RED: 0, AMBER: 0, YELLOW: 0, GREEN: 0, GOLD: 0, UNTOUCHED: 0,
  };
  for (const row of counts) out[row.status] = row.c;
  out.UNTOUCHED = 604 - counts.reduce((s, r) => s + r.c, 0);
  return out;
}

// ── Routes ─────────────────────────────────────────────────────────────────

router.get('/juz/:juz', authenticate, (req: AuthRequest, res: Response): void => {
  const juzNum = parseInt(req.params.juz, 10);
  if (isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
    res.status(400).json({ error: 'Juz must be 1..30' }); return;
  }
  const grid = buildJuzGrid(req.user!.id, juzNum);
  if (!grid) { res.status(404).json({ error: 'Juz not found' }); return; }
  res.json(grid);
});

router.get('/juz/:juz/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const juzNum = parseInt(req.params.juz, 10);
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(juzNum) || juzNum < 1 || juzNum > 30) { res.status(400).json({ error: 'Juz must be 1..30' }); return; }
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }
  const grid = buildJuzGrid(studentId, juzNum);
  if (!grid) { res.status(404).json({ error: 'Juz not found' }); return; }
  res.json(grid);
});

router.put('/page/:page', authenticate, (req: AuthRequest, res: Response): void => {
  const page = parseInt(req.params.page, 10);
  if (isNaN(page) || page < 1 || page > 604) { res.status(400).json({ error: 'page must be 1..604' }); return; }
  if (req.user!.role !== 'student') {
    res.status(403).json({ error: 'Students only — ustadh must specify a studentId' }); return;
  }
  const parsed = z.object({ status: statusSchema, note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  res.json(setPageStatus(req.user!.id, req.user!.id, page, parsed.data.status, parsed.data.note));
});

router.put('/page/:page/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const page = parseInt(req.params.page, 10);
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(page) || page < 1 || page > 604) { res.status(400).json({ error: 'page must be 1..604' }); return; }
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }
  const parsed = z.object({ status: statusSchema, note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  res.json(setPageStatus(user.id, studentId, page, parsed.data.status, parsed.data.note));
});

router.delete('/page/:page', authenticate, (req: AuthRequest, res: Response): void => {
  const page = parseInt(req.params.page, 10);
  if (isNaN(page) || page < 1 || page > 604) { res.status(400).json({ error: 'page must be 1..604' }); return; }
  if (req.user!.role !== 'student') {
    res.status(403).json({ error: 'Students only — ustadh must specify a studentId' }); return;
  }
  res.json(setPageStatus(req.user!.id, req.user!.id, page, null));
});

router.delete('/page/:page/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const page = parseInt(req.params.page, 10);
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(page) || page < 1 || page > 604) { res.status(400).json({ error: 'page must be 1..604' }); return; }
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }
  res.json(setPageStatus(user.id, studentId, page, null));
});

// ── Audit log ──────────────────────────────────────────────────────────────

function fetchAudit(studentId: number, limit: number, beforeId?: number) {
  const rows = db.prepare(`
    SELECT id, page_number, from_status, to_status, changed_at, changed_by, note
    FROM status_history
    WHERE student_id = ?
      ${beforeId ? 'AND id < ?' : ''}
    ORDER BY id DESC
    LIMIT ?
  `).all(...(beforeId ? [studentId, beforeId, limit] : [studentId, limit])) as Array<{
    id: number; page_number: number; from_status: PageStatus | null;
    to_status: PageStatus | null; changed_at: string; changed_by: number; note: string | null;
  }>;

  const userIds = Array.from(new Set(rows.map(r => r.changed_by)));
  const users = userIds.length
    ? db.prepare(`SELECT id, name, role FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`).all(...userIds) as Array<{ id: number; name: string; role: string }>
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  return rows.map(r => ({
    id: r.id, pageNumber: r.page_number,
    fromStatus: r.from_status, toStatus: r.to_status,
    changedAt: r.changed_at,
    changedByName: userMap.get(r.changed_by)?.name ?? '?',
    changedByRole: userMap.get(r.changed_by)?.role ?? null,
    note: r.note,
  }));
}

router.get('/audit', authenticate, (req: AuthRequest, res: Response): void => {
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
  const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
  res.json({ entries: fetchAudit(req.user!.id, limit, before) });
});

router.get('/audit/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const studentId = parseInt(req.params.studentId, 10);
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
  const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
  res.json({ entries: fetchAudit(studentId, limit, before) });
});

// ── All pages (flat, for grouped colour views) ─────────────────────────────

router.get('/pages', authenticate, (req: AuthRequest, res: Response): void => {
  const rows = stmtAllPages.all(req.user!.id) as Array<{ page_number: number; status: PageStatus }>;
  res.json({ pages: rows.map(r => ({ pageNumber: r.page_number, status: r.status })) });
});

router.get('/pages/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const studentId = parseInt(req.params.studentId, 10);
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }
  const rows = stmtAllPages.all(studentId) as Array<{ page_number: number; status: PageStatus }>;
  res.json({ pages: rows.map(r => ({ pageNumber: r.page_number, status: r.status })) });
});

// ── Summary ────────────────────────────────────────────────────────────────

router.get('/summary', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ studentId: req.user!.id, counts: buildSummary(req.user!.id) });
});

router.get('/summary/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const studentId = parseInt(req.params.studentId, 10);
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }
  res.json({ studentId, counts: buildSummary(studentId) });
});

export default router;
