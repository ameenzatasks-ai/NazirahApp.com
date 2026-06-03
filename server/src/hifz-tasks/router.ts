/**
 * Hifz daily-task routes
 *
 *   POST   /api/hifz-tasks          — student submits one or more tasks
 *   GET    /api/hifz-tasks          — own task history (last 60)
 *   GET    /api/hifz-tasks/date/:date — tasks for a specific date
 *   GET    /api/hifz-tasks/student/:id — ustadh: student's history
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { authenticate, requireRole, AuthRequest } from '../auth/middleware';

const router = Router();

/* ── Helpers ─────────────────────────────────────────────────── */
function ustadhTeaches(ustadhId: number, studentId: number): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM enrolments e
       JOIN classes c ON c.id = e.class_id
       WHERE c.ustadh_id = ? AND e.student_id = ? LIMIT 1`,
    )
    .get(ustadhId, studentId);
}

function formatTask(r: any) {
  return {
    id:          r.id,
    taskDate:    r.task_date,
    taskType:    r.task_type,
    sabaqSurah:  r.sabaq_surah  ?? null,
    sabaqVerse:  r.sabaq_verse  ?? null,
    spStart:     r.sp_start     ?? null,
    dawrEntries: r.dawr_entries ? JSON.parse(r.dawr_entries) : null,
    submittedAt: r.submitted_at,
  };
}

/* ── Prepared statements ─────────────────────────────────────── */
const stmtInsertTask = db.prepare(`
  INSERT INTO hifz_daily_tasks
    (student_id, task_date, task_type,
     sabaq_surah, sabaq_verse, sp_start, dawr_entries)
  VALUES (?,?,?,?,?,?,?)
`);

const stmtOwnHistory = db.prepare(`
  SELECT * FROM hifz_daily_tasks
  WHERE student_id = ?
  ORDER BY task_date DESC, submitted_at DESC
  LIMIT 60
`);

const stmtByDate = db.prepare(`
  SELECT * FROM hifz_daily_tasks
  WHERE student_id = ? AND task_date = ?
  ORDER BY submitted_at ASC
`);

const stmtStudentHistory = db.prepare(`
  SELECT * FROM hifz_daily_tasks
  WHERE student_id = ?
  ORDER BY task_date DESC, submitted_at DESC
  LIMIT 60
`);

/* ── Dawr log helpers ────────────────────────────────────────── */
const stmtUpsertDawr = db.prepare(`
  INSERT INTO hifz_dawr_log (student_id, juz_number, quarter, logged_date)
  VALUES (?,?,?,?)
  ON CONFLICT(student_id, juz_number, quarter)
  DO UPDATE SET logged_date = excluded.logged_date
`);

/* ── Submit tasks ────────────────────────────────────────────── */

const DawrEntrySchema = z.object({
  juz:     z.number().int().min(1).max(30),
  quarter: z.enum(['1/4','1/2','3/4','full']),
});

const TaskSchema = z.discriminatedUnion('taskType', [
  z.object({
    taskType:   z.literal('sabaq'),
    sabaqSurah: z.number().int().min(1).max(114).optional(),
    sabaqVerse: z.number().int().min(1).optional(),
  }),
  z.object({
    taskType: z.literal('sabaq_para'),
    spStart:  z.number().int().min(1).max(595).optional(),
  }),
  z.object({
    taskType:    z.literal('dawr'),
    dawrEntries: z.array(DawrEntrySchema).min(1),
  }),
]);

const SubmitSchema = z.object({
  date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tasks: z.array(TaskSchema).min(1).max(10),
});

router.post(
  '/',
  authenticate,
  requireRole('student'),
  (req: AuthRequest, res: Response): void => {
    const user = req.user!;
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { date, tasks } = parsed.data;

    const insertAll = db.transaction(() => {
      for (const task of tasks) {
        const dawrJson =
          task.taskType === 'dawr'
            ? JSON.stringify(task.dawrEntries)
            : null;
        const sabaqSurah =
          task.taskType === 'sabaq' ? (task.sabaqSurah ?? null) : null;
        const sabaqVerse =
          task.taskType === 'sabaq' ? (task.sabaqVerse ?? null) : null;
        const spStart =
          task.taskType === 'sabaq_para' ? (task.spStart ?? null) : null;

        stmtInsertTask.run(
          user.id, date, task.taskType,
          sabaqSurah, sabaqVerse, spStart, dawrJson,
        );

        // Update dawr_log for each Dawr entry
        if (task.taskType === 'dawr') {
          for (const e of task.dawrEntries) {
            stmtUpsertDawr.run(user.id, e.juz, e.quarter, date);
          }
        }
      }
    });

    insertAll();
    res.status(201).json({ submitted: tasks.length });
  },
);

/* ── Own history ────────────────────────────────────────────────*/
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  const rows = stmtOwnHistory.all(req.user!.id) as any[];
  res.json({ tasks: rows.map(formatTask) });
});

/* ── Tasks for a specific date ──────────────────────────────────*/
router.get('/date/:date', authenticate, (req: AuthRequest, res: Response): void => {
  const rows = stmtByDate.all(req.user!.id, req.params.date) as any[];
  res.json({ tasks: rows.map(formatTask) });
});

/* ── Ustadh: student's history ──────────────────────────────────*/
router.get(
  '/student/:studentId',
  authenticate,
  requireRole('ustadh'),
  (req: AuthRequest, res: Response): void => {
    const studentId = parseInt(req.params.studentId, 10);
    if (!ustadhTeaches(req.user!.id, studentId)) {
      res.status(403).json({ error: 'Not your student' });
      return;
    }
    const rows = stmtStudentHistory.all(studentId) as any[];
    res.json({ tasks: rows.map(formatTask) });
  },
);

export default router;
