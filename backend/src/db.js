import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('student','parent','teacher','counselor','admin')),
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  token_version INTEGER NOT NULL DEFAULT 0,
  odoo_partner_id INTEGER,
  fedena_admission_no TEXT,
  email TEXT,
  phone TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- A parent account can see several children (used from a later phase)
CREATE TABLE IF NOT EXISTS parent_students (
  parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_user_id, student_user_id)
);

-- ───────── Fedena mirror (read-only copy, refreshed by scripts/sync-fedena.js) ─────────
CREATE TABLE IF NOT EXISTS fedena_batches (
  batch_key TEXT PRIMARY KEY,               -- 'G11|A2 26/27'
  course_code TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,                  -- 'G11 - A2 26/27'
  start_date TEXT,
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fedena_students (
  admission_no TEXT PRIMARY KEY COLLATE NOCASE,
  name TEXT,
  batch_key TEXT,
  batch_full_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fedena_subjects (
  batch_key TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  no_exams INTEGER NOT NULL DEFAULT 0,
  max_weekly_classes INTEGER,
  elective_group TEXT,
  is_floating_elective INTEGER NOT NULL DEFAULT 0,
  assigned_students TEXT NOT NULL DEFAULT '[]',  -- JSON list; empty = whole batch
  employee_numbers TEXT NOT NULL DEFAULT '[]',   -- JSON list (lower-case)
  active INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (batch_key, code)
);

-- Only what the app needs. Date of birth, address, phone and photo are deliberately NOT copied.
CREATE TABLE IF NOT EXISTS fedena_employees (
  employee_number TEXT PRIMARY KEY COLLATE NOCASE,
  name TEXT,
  department TEXT,
  category TEXT,
  position TEXT,
  email TEXT,
  status INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fedena_grading_levels (
  scope TEXT NOT NULL,                      -- '' = global, otherwise the batch it applies to
  name TEXT NOT NULL,
  min_score REAL NOT NULL,
  credit_points REAL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (scope, name)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',   -- running | ok | error
  item_count INTEGER,
  message TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  user_id INTEGER,
  action TEXT NOT NULL,
  ip TEXT,
  detail TEXT
);
`;

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

export function audit(db, userId, action, ip, detail = '') {
  db.prepare('INSERT INTO audit_log (user_id, action, ip, detail) VALUES (?,?,?,?)')
    .run(userId ?? null, action, ip ?? null, String(detail).slice(0, 500));
}
