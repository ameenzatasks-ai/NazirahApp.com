/**
 * Nazira log router — weekly status snapshots.
 *
 * Routes:
 *   POST   /api/nazirah/log                              — student saves snapshot
 *   GET    /api/nazirah/logs                             — own logs list
 *   GET    /api/nazirah/logs/:logId                      — own log detail
 *   GET    /api/nazirah/logs/student/:studentId          — ustadh: student's logs
 *   GET    /api/nazirah/logs/:logId/student/:studentId   — ustadh: log detail
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { authenticate, AuthRequest } from '../auth/middleware';
import type { PageStatus } from '../../../shared/juz-map';

const router = Router();

/** Confirms an ustadh teaches the given student in at least one of their classes. */
function ustadhTeaches(ustadhId: number, studentId: number): boolean {
  return !!db.prepare(`
    SELECT 1 FROM enrolments e
    JOIN classes c ON c.id = e.class_id
    WHERE c.ustadh_id = ? AND e.student_id = ?
    LIMIT 1
  `).get(ustadhId, studentId);
}

interface LogRow {
  id: number;
  student_id: number;
  log_date: string;
  notes: string | null;
  created_at: string;
}

interface PageRow {
  page_number: number;
  status: PageStatus;
}

function formatLogDetail(log: LogRow, pages: PageRow[]) {
  const grouped: Record<PageStatus, number[]> = {
    GOLD: [], GREEN: [], AMBER: [], RED: [], BLACK: [], YELLOW: [],
  };
  for (const p of pages) grouped[p.status].push(p.page_number);
  return {
    id: log.id,
    logDate: log.log_date,
    notes: log.notes,
    createdAt: log.created_at,
    pageCount: pages.length,
    grouped,
  };
}

// ─── Prepared statements (module-level so they compile once) ───────────────

const stmtGetCurrentPages = db.prepare(`
  SELECT page_number, status
  FROM student_page_status
  WHERE student_id = ? AND variant = 'NEW_MADANI'
  ORDER BY page_number ASC
`);

const stmtDeleteLog = db.prepare(`
  DELETE FROM nazirah_logs WHERE student_id = ? AND log_date = ?
`);

const stmtInsertLog = db.prepare(`
  INSERT INTO nazirah_logs (student_id, log_date) VALUES (?, ?)
`);

const stmtInsertPage = db.prepare(`
  INSERT INTO nazirah_log_pages (log_id, page_number, status) VALUES (?, ?, ?)
`);

const stmtGetLogByDate = db.prepare(`
  SELECT * FROM nazirah_logs WHERE student_id = ? AND log_date = ?
`);

const stmtGetLogById = db.prepare(`SELECT * FROM nazirah_logs WHERE id = ?`);

const stmtGetLogPages = db.prepare(`
  SELECT page_number, status FROM nazirah_log_pages WHERE log_id = ? ORDER BY page_number
`);

const stmtGetStudentLogById = db.prepare(`
  SELECT * FROM nazirah_logs WHERE id = ? AND student_id = ?
`);

/** Shape a list-row into the NazirahLogSummary wire format (includes per-color counts). */
function formatLogSummary(r: any) {
  return {
    id:         r.id,
    logDate:    r.log_date,
    createdAt:  r.created_at,
    pageCount:  r.page_count ?? 0,
    colorCounts: {
      BLACK:  r.cnt_black  ?? 0,
      RED:    r.cnt_red    ?? 0,
      AMBER:  r.cnt_amber  ?? 0,
      GREEN:  r.cnt_green  ?? 0,
      GOLD:   r.cnt_gold   ?? 0,
      YELLOW: r.cnt_yellow ?? 0,
    },
  };
}

/** Snapshot the student's current pages under a given date (idempotent). */
const saveSnapshot = db.transaction((studentId: number, logDate: string, pages: PageRow[]) => {
  // Delete any existing log for this date (cascade removes its pages)
  stmtDeleteLog.run(studentId, logDate);
  // Insert fresh log header
  const result = stmtInsertLog.run(studentId, logDate);
  const logId = result.lastInsertRowid as number;
  // Insert each page
  for (const p of pages) {
    stmtInsertPage.run(logId, p.page_number, p.status);
  }
  return logId;
});

// ── POST /log ───────────────────────────────────────────────────────────────
router.post('/log', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Students only' }); return;
  }

  const parsed = z
    .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD') })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message }); return;
  }

  const logDate = parsed.data.date;

  // Must be within the last 14 days (inclusive today)
  const target = new Date(logDate + 'T00:00:00');
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  cutoff.setHours(0, 0, 0, 0);

  if (target > todayEnd || target < cutoff) {
    res.status(400).json({ error: 'Date must be within the last 14 days' }); return;
  }

  // Read current page statuses
  const pages = stmtGetCurrentPages.all(user.id) as PageRow[];

  // Save the snapshot (deletes old log for same date, inserts fresh)
  const logId = saveSnapshot(user.id, logDate, pages);

  res.status(201).json({
    id: logId,
    logDate,
    pageCount: pages.length,
  });
});

// ── GET /logs — own list ────────────────────────────────────────────────────
router.get('/logs', authenticate, (req: AuthRequest, res: Response): void => {
  const rows = db.prepare(`
    SELECT nl.id, nl.log_date, nl.created_at,
      COUNT(nlp.id)                                           AS page_count,
      SUM(CASE WHEN nlp.status='BLACK'  THEN 1 ELSE 0 END)  AS cnt_black,
      SUM(CASE WHEN nlp.status='RED'    THEN 1 ELSE 0 END)  AS cnt_red,
      SUM(CASE WHEN nlp.status='AMBER'  THEN 1 ELSE 0 END)  AS cnt_amber,
      SUM(CASE WHEN nlp.status='GREEN'  THEN 1 ELSE 0 END)  AS cnt_green,
      SUM(CASE WHEN nlp.status='GOLD'   THEN 1 ELSE 0 END)  AS cnt_gold,
      SUM(CASE WHEN nlp.status='YELLOW' THEN 1 ELSE 0 END)  AS cnt_yellow
    FROM nazirah_logs nl
    LEFT JOIN nazirah_log_pages nlp ON nlp.log_id = nl.id
    WHERE nl.student_id = ?
    GROUP BY nl.id
    ORDER BY nl.log_date DESC
  `).all(req.user!.id) as any[];

  res.json({ logs: rows.map(formatLogSummary) });
});

// ── GET /logs/:logId — own detail ───────────────────────────────────────────
router.get('/logs/:logId', authenticate, (req: AuthRequest, res: Response): void => {
  const logId = parseInt(req.params.logId, 10);
  const log = stmtGetStudentLogById.get(logId, req.user!.id) as LogRow | undefined;
  if (!log) { res.status(404).json({ error: 'Log not found' }); return; }

  const pages = stmtGetLogPages.all(logId) as PageRow[];
  res.json(formatLogDetail(log, pages));
});

// ── GET /logs/student/:studentId — ustadh: list ─────────────────────────────
router.get('/logs/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const studentId = parseInt(req.params.studentId, 10);
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }

  const rows = db.prepare(`
    SELECT nl.id, nl.log_date, nl.created_at,
      COUNT(nlp.id)                                           AS page_count,
      SUM(CASE WHEN nlp.status='BLACK'  THEN 1 ELSE 0 END)  AS cnt_black,
      SUM(CASE WHEN nlp.status='RED'    THEN 1 ELSE 0 END)  AS cnt_red,
      SUM(CASE WHEN nlp.status='AMBER'  THEN 1 ELSE 0 END)  AS cnt_amber,
      SUM(CASE WHEN nlp.status='GREEN'  THEN 1 ELSE 0 END)  AS cnt_green,
      SUM(CASE WHEN nlp.status='GOLD'   THEN 1 ELSE 0 END)  AS cnt_gold,
      SUM(CASE WHEN nlp.status='YELLOW' THEN 1 ELSE 0 END)  AS cnt_yellow
    FROM nazirah_logs nl
    LEFT JOIN nazirah_log_pages nlp ON nlp.log_id = nl.id
    WHERE nl.student_id = ?
    GROUP BY nl.id
    ORDER BY nl.log_date DESC
  `).all(studentId) as any[];

  res.json({ logs: rows.map(formatLogSummary) });
});

// ── GET /logs/:logId/student/:studentId — ustadh: detail ───────────────────
router.get('/logs/:logId/student/:studentId', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'ustadh') { res.status(403).json({ error: 'Ustadh only' }); return; }
  const logId = parseInt(req.params.logId, 10);
  const studentId = parseInt(req.params.studentId, 10);
  if (!ustadhTeaches(user.id, studentId)) { res.status(403).json({ error: 'Not your student' }); return; }

  const log = db.prepare('SELECT * FROM nazirah_logs WHERE id = ? AND student_id = ?')
    .get(logId, studentId) as LogRow | undefined;
  if (!log) { res.status(404).json({ error: 'Log not found' }); return; }

  const pages = stmtGetLogPages.all(logId) as PageRow[];
  res.json(formatLogDetail(log, pages));
});

export default router;
