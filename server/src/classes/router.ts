import { Router, Response } from 'express';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import db from '../db';
import { authenticate, requireRole, AuthRequest } from '../auth/middleware';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

function generateJoinCode(): string {
  let code = nanoid();
  while (db.prepare('SELECT id FROM classes WHERE join_code = ?').get(code)) {
    code = nanoid();
  }
  return code;
}

const router = Router();

// POST /api/classes — Ustadh creates a class
router.post('/', authenticate, requireRole('ustadh'), (req: AuthRequest, res: Response): void => {
  const parsed = z.object({ name: z.string().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const joinCode = generateJoinCode();
  const result = db
    .prepare('INSERT INTO classes (name, ustadh_id, join_code) VALUES (?, ?, ?)')
    .run(parsed.data.name, req.user!.id, joinCode);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cls);
});

// GET /api/classes — list my classes
// Ustadh sees: classes they own + classes they've enrolled in (as learner).
// Student sees: classes they're enrolled in.
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  if (user.role === 'ustadh') {
    // Own classes (is_owner = 1)
    const owned = db.prepare(`
      SELECT c.id, c.name, c.ustadh_id, c.join_code, c.created_at,
             COUNT(e.id) AS student_count,
             NULL         AS ustadh_name,
             NULL         AS joined_at,
             1            AS is_owner
      FROM classes c
      LEFT JOIN enrolments e ON e.class_id = c.id
      WHERE c.ustadh_id = ?
      GROUP BY c.id
    `).all(user.id);

    // Enrolled classes (is_owner = 0) — Ustadh joined as a learner
    const enrolled = db.prepare(`
      SELECT c.id, c.name, c.ustadh_id, c.join_code, c.created_at,
             0            AS student_count,
             u.name       AS ustadh_name,
             en.joined_at AS joined_at,
             0            AS is_owner
      FROM enrolments en
      JOIN classes c ON c.id = en.class_id
      JOIN users   u ON u.id = c.ustadh_id
      WHERE en.student_id = ?
        AND c.ustadh_id != ?
    `).all(user.id, user.id);

    // Merge and sort by created_at DESC
    const all = [...owned, ...enrolled].sort((a: any, b: any) =>
      b.created_at.localeCompare(a.created_at)
    );
    res.json(all);
  } else {
    const classes = db.prepare(`
      SELECT c.*, u.name as ustadh_name, u.avatar_url as ustadh_avatar, e.joined_at
      FROM enrolments e
      JOIN classes c ON c.id = e.class_id
      JOIN users u ON u.id = c.ustadh_id
      WHERE e.student_id = ?
      ORDER BY e.joined_at DESC
    `).all(user.id);
    res.json(classes);
  }
});

// GET /api/classes/:id — class details (owner Ustadh OR enrolled student)
router.get('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const user = req.user!;

  if (user.role === 'ustadh') {
    const cls = db.prepare('SELECT * FROM classes WHERE id = ? AND ustadh_id = ?').get(classId, user.id);
    if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }
    res.json(cls);
  } else {
    // Student must be enrolled
    const enrolled = db.prepare('SELECT id FROM enrolments WHERE class_id = ? AND student_id = ?').get(classId, user.id);
    if (!enrolled) { res.status(404).json({ error: 'Class not found' }); return; }
    const cls = db.prepare(`
      SELECT c.*, u.name as ustadh_name
      FROM classes c
      JOIN users u ON u.id = c.ustadh_id
      WHERE c.id = ?
    `).get(classId);
    if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }
    res.json(cls);
  }
});

// PATCH /api/classes/:id — Ustadh renames their class
router.patch('/:id', authenticate, requireRole('ustadh'), (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const parsed = z.object({ name: z.string().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND ustadh_id = ?').get(classId, req.user!.id);
  if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }

  db.prepare('UPDATE classes SET name = ? WHERE id = ?').run(parsed.data.name, classId);
  const updated = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  res.json(updated);
});

// DELETE /api/classes/:id — Ustadh deletes their class entirely.
// Cascades: removes dependent enrolments and invitations first so FK constraints
// don't block the parent delete. Student weekly_snapshots / page_reads are
// student-owned and stay intact (a student may belong to other classes).
router.delete('/:id', authenticate, requireRole('ustadh'), (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND ustadh_id = ?').get(classId, req.user!.id);
  if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }

  const tx = db.transaction((id: number) => {
    db.prepare('DELETE FROM class_invitations WHERE class_id = ?').run(id);
    db.prepare('DELETE FROM enrolments        WHERE class_id = ?').run(id);
    db.prepare('DELETE FROM classes           WHERE id = ?').run(id);
  });
  tx(classId);

  res.json({ message: 'Class deleted' });
});

// POST /api/classes/join — Any authenticated user joins a class by code
router.post('/join', authenticate, (req: AuthRequest, res: Response): void => {
  const parsed = z.object({ joinCode: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'joinCode required' }); return; }

  const code = parsed.data.joinCode.toUpperCase();
  const cls = db.prepare('SELECT * FROM classes WHERE join_code = ?').get(code) as any;
  if (!cls) { res.status(404).json({ error: 'Class not found. Check the join code.' }); return; }

  const existing = db
    .prepare('SELECT id FROM enrolments WHERE class_id = ? AND student_id = ?')
    .get(cls.id, req.user!.id);
  if (existing) { res.status(409).json({ error: 'Already enrolled in this class' }); return; }

  db.prepare('INSERT INTO enrolments (class_id, student_id) VALUES (?, ?)').run(cls.id, req.user!.id);
  const ustadh = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(cls.ustadh_id) as any;
  res.status(201).json({ ...cls, ustadh_name: ustadh?.name, ustadh_avatar: ustadh?.avatar_url });
});

// DELETE /api/classes/:id/leave — Student leaves a class
router.delete('/:id/leave', authenticate, requireRole('student'), (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const result = db
    .prepare('DELETE FROM enrolments WHERE class_id = ? AND student_id = ?')
    .run(classId, req.user!.id);
  if (result.changes === 0) { res.status(404).json({ error: 'Enrolment not found' }); return; }
  res.json({ message: 'Left class successfully' });
});

// GET /api/classes/:id/students — student list with latest snapshot (Ustadh only)
router.get('/:id/students', authenticate, requireRole('ustadh'), (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND ustadh_id = ?').get(classId, req.user!.id);
  if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }

  const students = db
    .prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url, e.joined_at
      FROM enrolments e
      JOIN users u ON u.id = e.student_id
      WHERE e.class_id = ?
      ORDER BY u.name ASC
    `)
    .all(classId) as Array<{ id: number; name: string; email: string; avatar_url: string | null; joined_at: string }>;

  const result = students.map((s) => {
    const snap = db
      .prepare('SELECT * FROM weekly_snapshots WHERE student_id = ? ORDER BY week_number DESC LIMIT 1')
      .get(s.id);
    return { ...s, latest_snapshot: snap || null };
  });

  res.json(result);
});

// GET /api/classes/:id/students/:studentId/pages
router.get('/:id/students/:studentId/pages', authenticate, requireRole('ustadh'), (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const studentId = parseInt(req.params.studentId, 10);

  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND ustadh_id = ?').get(classId, req.user!.id);
  if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }

  const enrolment = db.prepare('SELECT id FROM enrolments WHERE class_id = ? AND student_id = ?').get(classId, studentId);
  if (!enrolment) { res.status(404).json({ error: 'Student not enrolled' }); return; }

  const student = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(studentId) as any;
  const rows = db
    .prepare('SELECT page_number, last_read_at FROM page_reads WHERE student_id = ? AND read_count >= 1 ORDER BY page_number ASC')
    .all(studentId) as Array<{ page_number: number; last_read_at: string }>;

  res.json({
    student,
    listenedPages: rows.map(r => ({ pageNumber: r.page_number, listenedAt: r.last_read_at })),
    total: rows.length,
  });
});

/** Build a 7-color count of pages for one student (out of 604 total). */
function buildStudentCounts(studentId: number) {
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS c
    FROM student_page_status
    WHERE student_id = ? AND variant = 'NEW_MADANI'
    GROUP BY status
  `).all(studentId) as Array<{ status: string; c: number }>;
  const counts: Record<string, number> = {
    BLACK: 0, RED: 0, AMBER: 0, YELLOW: 0, GREEN: 0, GOLD: 0, UNTOUCHED: 0,
  };
  for (const r of rows) counts[r.status] = r.c;
  const tracked = rows.reduce((sum, r) => sum + r.c, 0);
  counts.UNTOUCHED = 604 - tracked;
  return counts;
}

// GET /api/classes/:id/students/:studentId/summary — Ustadh dashboard tile
router.get('/:id/students/:studentId/summary', authenticate, requireRole('ustadh'), (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const studentId = parseInt(req.params.studentId, 10);

  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND ustadh_id = ?').get(classId, req.user!.id);
  if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }

  const enrolment = db.prepare('SELECT id FROM enrolments WHERE class_id = ? AND student_id = ?').get(classId, studentId);
  if (!enrolment) { res.status(404).json({ error: 'Student not enrolled' }); return; }

  const student = db.prepare('SELECT id, name, email, avatar_url FROM users WHERE id = ?').get(studentId);
  res.json({ student, counts: buildStudentCounts(studentId) });
});

// GET /api/classes/:id/students-with-summary — Ustadh roster + counts per student
router.get('/:id/students-with-summary', authenticate, requireRole('ustadh'), (req: AuthRequest, res: Response): void => {
  const classId = parseInt(req.params.id, 10);
  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND ustadh_id = ?').get(classId, req.user!.id);
  if (!cls) { res.status(404).json({ error: 'Class not found' }); return; }

  const students = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_url, e.joined_at
    FROM enrolments e
    JOIN users u ON u.id = e.student_id
    WHERE e.class_id = ?
    ORDER BY u.name ASC
  `).all(classId) as Array<{ id: number; name: string; email: string; avatar_url: string | null; joined_at: string }>;

  res.json(students.map(s => ({ ...s, counts: buildStudentCounts(s.id) })));
});

export default router;
