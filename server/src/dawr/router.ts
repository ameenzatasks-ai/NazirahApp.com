/**
 * Dawr Log routes — 30 Juz × 4 quarters progress grid.
 *
 *   GET    /api/dawr                           — student's own grid
 *   GET    /api/dawr/student/:id               — ustadh: student's grid
 *   PATCH  /api/dawr/:juz/:quarter             — ustadh: score a cell
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { authenticate, requireRole, AuthRequest } from '../auth/middleware';

const router = Router();

const QUARTERS = ['1/4', '1/2', '3/4', 'full'] as const;
type Quarter = typeof QUARTERS[number];

const QUARTER_LABELS: Record<Quarter, string> = {
  '1/4':  '¼',
  '1/2':  '½',
  '3/4':  '¾',
  'full': 'Full',
};

/* Score 1–7 display labels */
const SCORE_LABELS: Record<number, string> = {
  1: 'Repeat',
  2: 'Weak',
  3: 'Needs Work',
  4: 'Average',
  5: 'Good',
  6: 'Very Good',
  7: 'Excellent',
};

/* Score colours for 1–7 */
export const SCORE_COLOURS: Record<number, string> = {
  1: '#C53030',  // red
  2: '#E05C00',  // dark orange
  3: '#D97706',  // amber
  4: '#B8862A',  // gold
  5: '#0D7264',  // teal
  6: '#166534',  // green
  7: '#0F4C3A',  // dark green
};

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

function buildGrid(studentId: number) {
  const rows = db.prepare(
    `SELECT juz_number, quarter, logged_date, score, score_label, comment,
            scored_by, scored_at
     FROM hifz_dawr_log WHERE student_id = ?`,
  ).all(studentId) as any[];

  // Map keyed by "juz:quarter"
  const map: Record<string, any> = {};
  for (const r of rows) map[`${r.juz_number}:${r.quarter}`] = r;

  const grid: Array<{
    juz: number;
    quarter: Quarter;
    quarterLabel: string;
    loggedDate: string | null;
    score: number | null;
    scoreLabel: string | null;
    scoreColour: string | null;
    comment: string | null;
    scoredAt: string | null;
  }> = [];

  for (let juz = 1; juz <= 30; juz++) {
    for (const q of QUARTERS) {
      const cell = map[`${juz}:${q}`];
      grid.push({
        juz,
        quarter:      q,
        quarterLabel: QUARTER_LABELS[q],
        loggedDate:   cell?.logged_date ?? null,
        score:        cell?.score ?? null,
        scoreLabel:   cell?.score_label ?? null,
        scoreColour:  cell?.score != null ? SCORE_COLOURS[cell.score] : null,
        comment:      cell?.comment ?? null,
        scoredAt:     cell?.scored_at ?? null,
      });
    }
  }
  return grid;
}

/* ── Prepared statements ─────────────────────────────────────── */
const stmtScore = db.prepare(`
  INSERT INTO hifz_dawr_log
    (student_id, juz_number, quarter, logged_date,
     score, score_label, comment, scored_by, scored_at)
  VALUES (?,?,?,COALESCE((
    SELECT logged_date FROM hifz_dawr_log
    WHERE student_id=? AND juz_number=? AND quarter=?
  ), date('now')),?,?,?,?,datetime('now'))
  ON CONFLICT(student_id, juz_number, quarter)
  DO UPDATE SET
    score       = excluded.score,
    score_label = excluded.score_label,
    comment     = excluded.comment,
    scored_by   = excluded.scored_by,
    scored_at   = excluded.scored_at
`);

/* ── Routes ──────────────────────────────────────────────────── */

/* Own grid */
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({
    grid:        buildGrid(req.user!.id),
    scoreLabels: SCORE_LABELS,
    scoreColours: SCORE_COLOURS,
  });
});

/* Ustadh: student's grid */
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
    res.json({
      grid:        buildGrid(studentId),
      scoreLabels: SCORE_LABELS,
      scoreColours: SCORE_COLOURS,
    });
  },
);

/* Ustadh: score a cell */
router.patch(
  '/:juz/:quarter',
  authenticate,
  requireRole('ustadh'),
  (req: AuthRequest, res: Response): void => {
    const juz     = parseInt(req.params.juz, 10);
    const quarter = req.params.quarter as Quarter;

    if (isNaN(juz) || juz < 1 || juz > 30 || !QUARTERS.includes(quarter)) {
      res.status(400).json({ error: 'Invalid juz or quarter' });
      return;
    }

    const parsed = z.object({
      studentId: z.number().int(),
      score:     z.number().int().min(1).max(7),
      comment:   z.string().max(500).optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { studentId, score, comment } = parsed.data;

    if (!ustadhTeaches(req.user!.id, studentId)) {
      res.status(403).json({ error: 'Not your student' });
      return;
    }

    stmtScore.run(
      studentId, juz, quarter,
      studentId, juz, quarter,  // for COALESCE sub-select
      score, SCORE_LABELS[score], comment ?? null,
      req.user!.id,
    );

    res.json({ ok: true, scoreLabel: SCORE_LABELS[score] });
  },
);

export default router;
