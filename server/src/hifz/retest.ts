/**
 * Automatic "Test 2 completed → Re-test needed" ageing.
 *
 * A page marked GREEN (Test 2 completed) goes stale after ten days and must be
 * re-tested, so it flips to YELLOW (Re-test needed) on its own.
 *
 * The flip is applied lazily, immediately before any read of a student's page
 * statuses, rather than by a scheduled job. A timer is not usable here: the
 * host suspends the process when idle, so a job would simply not fire — and a
 * page must read as Re-test the moment someone looks at it, even if the server
 * was asleep for the whole ten days.
 *
 * The clock is `updated_at`, which the status upsert refreshes on every real
 * change. For a row currently GREEN that is exactly when it became GREEN, so
 * re-marking a page as Test 2 completed restarts its ten days.
 *
 * Sweeping writes real rows rather than deriving the colour at render time, so
 * that the stored status, the audit timeline and the UI cannot disagree, and so
 * a later edit sees GREEN → YELLOW as its previous status.
 */
import db from '../db';

export const RETEST_AFTER_DAYS = 10;

const stmtDue = db.prepare(`
  SELECT page_number
  FROM student_page_status
  WHERE student_id = ?
    AND variant = 'NEW_MADANI'
    AND status = 'GREEN'
    AND julianday('now') - julianday(updated_at) >= ?
`);

const stmtFlip = db.prepare(`
  UPDATE student_page_status
  SET status = 'YELLOW', updated_at = datetime('now')
  WHERE student_id = ? AND variant = 'NEW_MADANI' AND page_number = ?
`);

const stmtHistory = db.prepare(`
  INSERT INTO status_history
    (student_id, variant, page_number, from_status, to_status, changed_by, note)
  VALUES (?, 'NEW_MADANI', ?, 'GREEN', 'YELLOW', ?, ?)
`);

const NOTE = `Automatic — ${RETEST_AFTER_DAYS} days since Test 2 completed`;

const sweepTx = db.transaction((studentId: number, pages: number[]) => {
  for (const page of pages) {
    stmtFlip.run(studentId, page);
    // changed_by is NOT NULL, and there is no system account, so the change is
    // attributed to the student whose page it is.
    stmtHistory.run(studentId, page, studentId, NOTE);
  }
});

/**
 * Flip this student's overdue Ready pages to Re-test.
 * Safe to call on every read: when nothing is due it is a single indexed
 * SELECT that matches no rows and writes nothing.
 *
 * @returns how many pages were flipped.
 */
export function sweepRetest(studentId: number): number {
  const due = stmtDue.all(studentId, RETEST_AFTER_DAYS) as Array<{ page_number: number }>;
  if (due.length === 0) return 0;
  sweepTx(studentId, due.map(r => r.page_number));
  return due.length;
}
