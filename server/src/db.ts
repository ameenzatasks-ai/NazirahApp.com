import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../nazirah.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function runMigrations(): void {
  // ── Legacy schema detection ──────────────────────────────────
  // v1 (password-auth era) → drop everything.
  try {
    db.prepare('SELECT password FROM users LIMIT 1').get();
    console.log('Detected v1 schema — dropping all tables for v2 migration...');
    db.exec(`
      DROP TABLE IF EXISTS announcements;
      DROP TABLE IF EXISTS page_reads;
      DROP TABLE IF EXISTS enrolments;
      DROP TABLE IF EXISTS classes;
      DROP TABLE IF EXISTS users;
    `);
  } catch {
    /* not v1 */
  }

  // ── Core schema (idempotent) ─────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id    TEXT    UNIQUE NOT NULL,
      name         TEXT    NOT NULL,
      email        TEXT    UNIQUE NOT NULL,
      avatar_url   TEXT,
      role         TEXT    CHECK(role IN ('ustadh', 'student')),
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      ustadh_id   INTEGER NOT NULL REFERENCES users(id),
      join_code   TEXT    UNIQUE NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enrolments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id    INTEGER NOT NULL REFERENCES classes(id),
      student_id  INTEGER NOT NULL REFERENCES users(id),
      joined_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(class_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS page_reads (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id     INTEGER NOT NULL REFERENCES users(id),
      page_number    INTEGER NOT NULL CHECK(page_number BETWEEN 1 AND 604),
      read_count     INTEGER NOT NULL DEFAULT 0 CHECK(read_count >= 0),
      last_read_at   TEXT,
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, page_number)
    );

    CREATE TABLE IF NOT EXISTS class_invitations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id    INTEGER NOT NULL REFERENCES classes(id),
      phone       TEXT    NOT NULL,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Page-level status (one row per page per student) ───────
    -- Pages without a row are "untouched" (default state).
    CREATE TABLE IF NOT EXISTS student_page_status (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id     INTEGER NOT NULL REFERENCES users(id),
      variant        TEXT    NOT NULL DEFAULT 'NEW_MADANI',
      page_number    INTEGER NOT NULL CHECK(page_number BETWEEN 1 AND 604),
      status         TEXT    NOT NULL
                             CHECK(status IN ('BLACK','RED','AMBER','YELLOW','GREEN','GOLD')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      set_by_user_id INTEGER NOT NULL REFERENCES users(id),
      UNIQUE(student_id, variant, page_number)
    );

    -- ── Bank-statement audit log ────────────────────────────────
    CREATE TABLE IF NOT EXISTS status_history (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id     INTEGER NOT NULL REFERENCES users(id),
      variant        TEXT    NOT NULL DEFAULT 'NEW_MADANI',
      page_number    INTEGER NOT NULL,
      from_status    TEXT,
      to_status      TEXT,   -- NULL = untouched (page status row deleted)
      changed_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      changed_by     INTEGER NOT NULL REFERENCES users(id),
      note           TEXT
    );

    -- ── Indexes ─────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_page_reads_student    ON page_reads(student_id);
    CREATE INDEX IF NOT EXISTS idx_enrolments_class      ON enrolments(class_id);
    CREATE INDEX IF NOT EXISTS idx_enrolments_student    ON enrolments(student_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_class     ON class_invitations(class_id);
    CREATE INDEX IF NOT EXISTS idx_page_status_lookup
      ON student_page_status(student_id, variant, page_number);
    CREATE INDEX IF NOT EXISTS idx_history_student_time
      ON status_history(student_id, changed_at DESC);

    -- ── Nazira weekly log snapshots ─────────────────────────────
    -- Student taps "Save" → current page statuses are snapshotted here.
    -- One header row per (student, date); pages stored in nazirah_log_pages.
    -- The UNIQUE constraint means re-saving on the same date overwrites.
    CREATE TABLE IF NOT EXISTS nazirah_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      log_date   TEXT    NOT NULL,   -- YYYY-MM-DD (student-chosen date)
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS nazirah_log_pages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id      INTEGER NOT NULL REFERENCES nazirah_logs(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL CHECK(page_number BETWEEN 1 AND 604),
      status      TEXT    NOT NULL
                          CHECK(status IN ('BLACK','RED','AMBER','YELLOW','GREEN','GOLD')),
      UNIQUE(log_id, page_number)
    );

    CREATE INDEX IF NOT EXISTS idx_nazirah_logs_student
      ON nazirah_logs(student_id, log_date DESC);
    CREATE INDEX IF NOT EXISTS idx_nazirah_log_pages_log
      ON nazirah_log_pages(log_id);

    -- ── Drop deprecated tables from earlier iterations ─────────
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS weekly_snapshots;
    DROP TABLE IF EXISTS student_quarter_status;
  `);

  // ── status_history schema repair ───────────────────────────────────────────
  //
  // Two legacy problems can exist in the live database:
  //   1. quarter_index NOT NULL  — column from the quarter-based era; caused
  //      SQLITE_CONSTRAINT_NOTNULL on every INSERT once the code stopped
  //      supplying it.
  //   2. to_status NOT NULL      — old schema; breaks the "untouch page"
  //      operation that sets to_status = NULL in history.
  //
  // CREATE TABLE IF NOT EXISTS never alters existing tables, so we must detect
  // and repair manually.  The fix: recreate the table with the correct schema,
  // copying all surviving columns.
  //
  interface ColInfo { name: string; notnull: number }
  const histCols = db.prepare("PRAGMA table_info(status_history)").all() as ColInfo[];
  const hasQuarterIndex = histCols.some(c => c.name === 'quarter_index');
  const toStatusNotNull  = histCols.some(c => c.name === 'to_status' && c.notnull === 1);

  if (hasQuarterIndex || toStatusNotNull) {
    console.log('Repairing status_history schema (stale constraints detected)...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS status_history_v3 (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id     INTEGER NOT NULL REFERENCES users(id),
        variant        TEXT    NOT NULL DEFAULT 'NEW_MADANI',
        page_number    INTEGER NOT NULL,
        from_status    TEXT,
        to_status      TEXT,
        changed_at     TEXT    NOT NULL DEFAULT (datetime('now')),
        changed_by     INTEGER NOT NULL REFERENCES users(id),
        note           TEXT
      )
    `);
    db.exec(`
      INSERT OR IGNORE INTO status_history_v3
        (id, student_id, variant, page_number, from_status, to_status, changed_at, changed_by, note)
      SELECT id, student_id, variant, page_number, from_status, to_status, changed_at, changed_by, note
      FROM status_history
    `);
    db.exec('DROP TABLE status_history');
    db.exec('ALTER TABLE status_history_v3 RENAME TO status_history');
    db.exec('CREATE INDEX IF NOT EXISTS idx_history_student_time ON status_history(student_id, changed_at DESC)');
    console.log('status_history repair complete.');
  }
}

// Run migrations immediately so all tables exist before any router module
// imports db and compiles module-level prepared statements.
runMigrations();

export default db;
