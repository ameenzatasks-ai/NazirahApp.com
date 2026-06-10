import Database from 'better-sqlite3';
import path from 'path';

// __dirname when compiled = server/dist/ — go up 2 to project root.
// In production, set DATABASE_PATH env var to a persistent volume path instead.
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

  // ── Hifz module tables ────────────────────────────────────────────────────
  db.exec(`
    -- Student daily task submissions (Sabaq, Sabaq Para, Dawr)
    CREATE TABLE IF NOT EXISTS hifz_daily_tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id   INTEGER NOT NULL REFERENCES users(id),
      class_id     INTEGER REFERENCES classes(id),
      task_date    TEXT    NOT NULL,
      task_type    TEXT    NOT NULL
                           CHECK(task_type IN ('sabaq','sabaq_para','dawr')),
      sabaq_surah  INTEGER,
      sabaq_verse  INTEGER,
      sp_start     INTEGER,
      dawr_entries TEXT,   -- JSON: [{juz:1,quarter:"1/4"}, ...]
      submitted_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Dawr log grid: one row per (student, class, juz, quarter)
    -- Updated each time the student submits a matching Dawr task.
    CREATE TABLE IF NOT EXISTS hifz_dawr_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL REFERENCES users(id),
      class_id    INTEGER REFERENCES classes(id),
      juz_number  INTEGER NOT NULL CHECK(juz_number BETWEEN 1 AND 30),
      quarter     TEXT    NOT NULL CHECK(quarter IN ('1/4','1/2','3/4','full')),
      logged_date TEXT,
      score       INTEGER CHECK(score BETWEEN 1 AND 7),
      score_label TEXT,
      comment     TEXT,
      scored_by   INTEGER REFERENCES users(id),
      scored_at   TEXT,
      UNIQUE(student_id, class_id, juz_number, quarter)
    );

    -- Ustadh scores for SP, Sabaq, Tajwid, Adab (one row per student, class, date)
    CREATE TABLE IF NOT EXISTS hifz_task_scores (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id   INTEGER NOT NULL REFERENCES users(id),
      class_id     INTEGER REFERENCES classes(id),
      task_date    TEXT    NOT NULL,
      sp_score     INTEGER CHECK(sp_score     BETWEEN 1 AND 7),
      sabaq_score  INTEGER CHECK(sabaq_score  BETWEEN 1 AND 7),
      tajwid_score INTEGER CHECK(tajwid_score BETWEEN 1 AND 7),
      adab_score   INTEGER CHECK(adab_score   BETWEEN 1 AND 7),
      comment      TEXT,
      scored_by    INTEGER REFERENCES users(id),
      scored_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, class_id, task_date)
    );

    CREATE INDEX IF NOT EXISTS idx_hdt_student
      ON hifz_daily_tasks(student_id, task_date DESC);
    CREATE INDEX IF NOT EXISTS idx_hdl_student
      ON hifz_dawr_log(student_id);
    CREATE INDEX IF NOT EXISTS idx_hts_student
      ON hifz_task_scores(student_id, task_date DESC);

    -- SQLite treats NULL != NULL in UNIQUE constraints, so ON CONFLICT never fires
    -- for rows where class_id IS NULL.  These partial indexes cover that case so
    -- the targetless "ON CONFLICT DO UPDATE" upserts work correctly for both paths.
    CREATE UNIQUE INDEX IF NOT EXISTS uidx_hdl_noclass
      ON hifz_dawr_log(student_id, juz_number, quarter)
      WHERE class_id IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uidx_hts_noclass
      ON hifz_task_scores(student_id, task_date)
      WHERE class_id IS NULL;
  `);

  // ── Hifz class_id migration ────────────────────────────────────────────────
  // Add class_id to hifz tables if not present, and recreate tables with
  // updated UNIQUE constraints so data is isolated per class.
  interface ColInfo { name: string; notnull: number }
  const hdtCols = db.prepare("PRAGMA table_info(hifz_daily_tasks)").all() as ColInfo[];
  if (hdtCols.length > 0 && !hdtCols.some(c => c.name === 'class_id')) {
    console.log('Migrating Hifz tables to include class_id...');

    // 1. hifz_daily_tasks — just add column (no unique constraint affected)
    db.exec(`ALTER TABLE hifz_daily_tasks ADD COLUMN class_id INTEGER REFERENCES classes(id)`);

    // 2. hifz_dawr_log — recreate with new UNIQUE(student_id, class_id, juz_number, quarter)
    db.exec(`
      CREATE TABLE IF NOT EXISTS hifz_dawr_log_v2 (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  INTEGER NOT NULL REFERENCES users(id),
        class_id    INTEGER REFERENCES classes(id),
        juz_number  INTEGER NOT NULL CHECK(juz_number BETWEEN 1 AND 30),
        quarter     TEXT    NOT NULL CHECK(quarter IN ('1/4','1/2','3/4','full')),
        logged_date TEXT,
        score       INTEGER CHECK(score BETWEEN 1 AND 7),
        score_label TEXT,
        comment     TEXT,
        scored_by   INTEGER REFERENCES users(id),
        scored_at   TEXT,
        UNIQUE(student_id, class_id, juz_number, quarter)
      )
    `);
    db.exec(`
      INSERT OR IGNORE INTO hifz_dawr_log_v2
        (id, student_id, class_id, juz_number, quarter, logged_date,
         score, score_label, comment, scored_by, scored_at)
      SELECT id, student_id, NULL, juz_number, quarter, logged_date,
             score, score_label, comment, scored_by, scored_at
      FROM hifz_dawr_log
    `);
    db.exec('DROP TABLE hifz_dawr_log');
    db.exec('ALTER TABLE hifz_dawr_log_v2 RENAME TO hifz_dawr_log');

    // 3. hifz_task_scores — recreate with UNIQUE(student_id, class_id, task_date)
    db.exec(`
      CREATE TABLE IF NOT EXISTS hifz_task_scores_v2 (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id   INTEGER NOT NULL REFERENCES users(id),
        class_id     INTEGER REFERENCES classes(id),
        task_date    TEXT    NOT NULL,
        sp_score     INTEGER CHECK(sp_score     BETWEEN 1 AND 7),
        sabaq_score  INTEGER CHECK(sabaq_score  BETWEEN 1 AND 7),
        tajwid_score INTEGER CHECK(tajwid_score BETWEEN 1 AND 7),
        adab_score   INTEGER CHECK(adab_score   BETWEEN 1 AND 7),
        comment      TEXT,
        scored_by    INTEGER REFERENCES users(id),
        scored_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(student_id, class_id, task_date)
      )
    `);
    db.exec(`
      INSERT OR IGNORE INTO hifz_task_scores_v2
        (id, student_id, class_id, task_date, sp_score, sabaq_score,
         tajwid_score, adab_score, comment, scored_by, scored_at)
      SELECT id, student_id, NULL, task_date, sp_score, sabaq_score,
             tajwid_score, adab_score, comment, scored_by, scored_at
      FROM hifz_task_scores
    `);
    db.exec('DROP TABLE hifz_task_scores');
    db.exec('ALTER TABLE hifz_task_scores_v2 RENAME TO hifz_task_scores');

    // Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_hdt_class ON hifz_daily_tasks(student_id, class_id, task_date DESC);
      CREATE INDEX IF NOT EXISTS idx_hdl_class ON hifz_dawr_log(student_id, class_id);
      CREATE INDEX IF NOT EXISTS idx_hts_class ON hifz_task_scores(student_id, class_id, task_date DESC);
    `);
    console.log('Hifz class_id migration complete.');
  }

  // After migration, ensure class_id indexes exist (safe for fresh DBs too)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hdt_class ON hifz_daily_tasks(student_id, class_id, task_date DESC);
    CREATE INDEX IF NOT EXISTS idx_hdl_class ON hifz_dawr_log(student_id, class_id);
    CREATE INDEX IF NOT EXISTS idx_hts_class ON hifz_task_scores(student_id, class_id, task_date DESC);
  `);

  // ── Dawr cycles migration ───────────────────────────────────────────────────
  // Old: UNIQUE(student_id, class_id, juz_number, quarter) — one row per juz/quarter
  // New: UNIQUE(student_id, class_id, juz_number, quarter, logged_date) — one row per cycle
  const noClassIdxCols = db
    .prepare('PRAGMA index_info(uidx_hdl_noclass)')
    .all() as Array<{ name: string }>;
  if (!noClassIdxCols.some(c => c.name === 'logged_date')) {
    console.log('Migrating hifz_dawr_log to support dawr cycles...');
    db.exec(`
      CREATE TABLE hifz_dawr_log_cyc (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  INTEGER NOT NULL REFERENCES users(id),
        class_id    INTEGER REFERENCES classes(id),
        juz_number  INTEGER NOT NULL CHECK(juz_number BETWEEN 1 AND 30),
        quarter     TEXT    NOT NULL CHECK(quarter IN ('1/4','1/2','3/4','full')),
        logged_date TEXT    NOT NULL DEFAULT (date('now')),
        score       INTEGER CHECK(score BETWEEN 1 AND 7),
        score_label TEXT,
        comment     TEXT,
        scored_by   INTEGER REFERENCES users(id),
        scored_at   TEXT,
        UNIQUE(student_id, class_id, juz_number, quarter, logged_date)
      )
    `);
    db.exec(`
      INSERT OR IGNORE INTO hifz_dawr_log_cyc
        (id, student_id, class_id, juz_number, quarter, logged_date,
         score, score_label, comment, scored_by, scored_at)
      SELECT id, student_id, class_id, juz_number, quarter,
             COALESCE(logged_date, date('now')),
             score, score_label, comment, scored_by, scored_at
      FROM hifz_dawr_log
    `);
    db.exec('DROP INDEX IF EXISTS uidx_hdl_noclass');
    db.exec('DROP INDEX IF EXISTS idx_hdl_student');
    db.exec('DROP INDEX IF EXISTS idx_hdl_class');
    db.exec('DROP TABLE hifz_dawr_log');
    db.exec('ALTER TABLE hifz_dawr_log_cyc RENAME TO hifz_dawr_log');
    db.exec(`
      CREATE UNIQUE INDEX uidx_hdl_noclass
        ON hifz_dawr_log(student_id, juz_number, quarter, logged_date)
        WHERE class_id IS NULL;
      CREATE INDEX idx_hdl_student ON hifz_dawr_log(student_id);
      CREATE INDEX idx_hdl_class   ON hifz_dawr_log(student_id, class_id);
    `);
    console.log('Dawr cycles migration complete.');
  }

  // ── Sabaq lines migration ───────────────────────────────────────────────────
  // Add sabaq_lines column to hifz_daily_tasks if not present.
  const hdtColsNow = db.prepare('PRAGMA table_info(hifz_daily_tasks)').all() as Array<{ name: string }>;
  if (!hdtColsNow.some(c => c.name === 'sabaq_lines')) {
    db.exec('ALTER TABLE hifz_daily_tasks ADD COLUMN sabaq_lines INTEGER');
    console.log('Added sabaq_lines column to hifz_daily_tasks.');
  }

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
