import { arr, clean, leafTexts } from './xml.js';
import { fetchAllItems } from './client.js';

/* ───────── helpers ───────── */
export const batchKey = (course, name) => `${clean(course)}|${clean(name)}`;

/** "G11 - A2 26/27" → { course_code: 'G11', name: 'A2 26/27', key: 'G11|A2 26/27' } */
export function splitBatchName(full) {
  const f = clean(full);
  const i = f.indexOf(' - ');
  if (i < 0) return { course_code: '', name: f, key: `|${f}`, full: f };
  const course = f.slice(0, i), name = f.slice(i + 3);
  return { course_code: course, name, key: batchKey(course, name), full: f };
}

const dateOnly = (s) => (typeof s === 'string' ? s.slice(0, 10) : null);
const bool = (s) => (String(s).toLowerCase() === 'true' ? 1 : 0);
const todayStr = () => new Date().toISOString().slice(0, 10);

function inTransaction(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/* ───────── entity syncs: each returns the number of items processed ───────── */
export const SYNCS = {
  async batches({ db, client }) {
    const items = await fetchAllItems(client, '/api/batches', {}, 'batch');
    if (!items.length) throw new Error('Fedena returned no batches (refusing to wipe local data)');
    const ts = new Date().toISOString();
    const up = db.prepare(`INSERT INTO fedena_batches (batch_key, course_code, name, full_name, start_date, end_date, active, synced_at)
      VALUES (?,?,?,?,?,?,1,?) ON CONFLICT(batch_key) DO UPDATE SET course_code=excluded.course_code, name=excluded.name,
      full_name=excluded.full_name, start_date=excluded.start_date, end_date=excluded.end_date, active=1, synced_at=excluded.synced_at`);
    inTransaction(db, () => {
      for (const b of items) {
        const course = clean(b.course_code), name = clean(b.name);
        up.run(batchKey(course, name), course, name, `${course} - ${name}`, dateOnly(b.start_date), dateOnly(b.end_date), ts);
      }
      db.prepare('UPDATE fedena_batches SET active = 0 WHERE synced_at < ?').run(ts);
    });
    return items.length;
  },

  async grading({ db, client }) {
    const batches = activeBatches(db);
    if (!batches.length) throw new Error('No active batches; run the batches sync first');
    const ts = new Date().toISOString();
    const up = db.prepare(`INSERT INTO fedena_grading_levels (scope, name, min_score, credit_points, description, active, synced_at)
      VALUES (?,?,?,?,?,1,?) ON CONFLICT(scope, name) DO UPDATE SET min_score=excluded.min_score,
      credit_points=excluded.credit_points, description=excluded.description, active=1, synced_at=excluded.synced_at`);
    let n = 0;
    // levels may be global (batch field empty) or batch specific; ask once per active batch
    for (const b of batches) {
      const root = await client.getParsed('/api/grading_levels', { batch: b.full_name });
      const levels = arr(root?.grading_level);
      inTransaction(db, () => {
        for (const l of levels) {
          if (String(l.is_deleted).toLowerCase() === 'true') continue;
          up.run(clean(l.batch), clean(l.name), Number(l.min_score), Number(l.credit_points) || null, clean(l.description), ts);
          n++;
        }
      });
    }
    if (!n) throw new Error('Fedena returned no grading levels');
    db.prepare('UPDATE fedena_grading_levels SET active = 0 WHERE synced_at < ?').run(ts);
    return n;
  },

  async students({ db, client }) {
    const items = await fetchAllItems(client, '/api/students', {}, 'student');
    if (!items.length) throw new Error('Fedena returned no students (refusing to wipe local data)');
    const ts = new Date().toISOString();
    const up = db.prepare(`INSERT INTO fedena_students (admission_no, name, batch_key, batch_full_name, active, synced_at)
      VALUES (?,?,?,?,1,?) ON CONFLICT(admission_no) DO UPDATE SET name=excluded.name, batch_key=excluded.batch_key,
      batch_full_name=excluded.batch_full_name, active=1, synced_at=excluded.synced_at`);
    let n = 0;
    inTransaction(db, () => {
      for (const s of items) {
        const adm = clean(s.admission_no);
        if (!adm) continue;
        const b = splitBatchName(s.batch_name);
        up.run(adm, clean(s.student_name), b.key, b.full, ts);
        n++;
      }
      db.prepare('UPDATE fedena_students SET active = 0 WHERE synced_at < ?').run(ts);
    });
    return n;
  },

  async subjects({ db, client }) {
    const batches = activeBatches(db);
    if (!batches.length) throw new Error('No active batches; run the batches sync first');
    const up = db.prepare(`INSERT INTO fedena_subjects (batch_key, code, name, no_exams, max_weekly_classes, elective_group,
      is_floating_elective, assigned_students, employee_numbers, active, synced_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)
      ON CONFLICT(batch_key, code) DO UPDATE SET name=excluded.name, no_exams=excluded.no_exams,
      max_weekly_classes=excluded.max_weekly_classes, elective_group=excluded.elective_group,
      is_floating_elective=excluded.is_floating_elective, assigned_students=excluded.assigned_students,
      employee_numbers=excluded.employee_numbers, active=1, synced_at=excluded.synced_at`);
    let n = 0;
    for (const b of batches) {
      const root = await client.getParsed('/api/subjects', {
        'search[batch_name_equals]': b.name,
        'search[batch_course_code_equals]': b.course_code,
      });
      const subs = arr(root?.subject);
      if (!subs.length) continue; // new batch without subjects yet: keep whatever we had
      const ts = new Date().toISOString();
      inTransaction(db, () => {
        for (const s of subs) {
          const key = splitBatchName(s.batch).key || b.batch_key;
          up.run(key, clean(s.code), clean(s.name), bool(s.no_exams), Number(s.max_weekly_classes) || null,
            clean(s.elective_group), bool(s.is_floating_elective),
            JSON.stringify(leafTexts(s.assigned_students).map(clean)),
            JSON.stringify(arr(s.assigned_employees?.employee_number).map((e) => clean(e).toLowerCase()).filter(Boolean)), ts);
          n++;
        }
        db.prepare('UPDATE fedena_subjects SET active = 0 WHERE batch_key = ? AND synced_at < ?').run(b.batch_key, ts);
      });
    }
    return n;
  },

  async employees({ db, client, log = console }) {
    const wanted = new Set();
    for (const r of db.prepare('SELECT employee_numbers FROM fedena_subjects WHERE active = 1').all()) {
      for (const e of JSON.parse(r.employee_numbers)) wanted.add(e);
    }
    if (!wanted.size) throw new Error('No teachers referenced by subjects; run the subjects sync first');
    const up = db.prepare(`INSERT INTO fedena_employees (employee_number, name, department, category, position, email, status, active, synced_at)
      VALUES (?,?,?,?,?,?,?,1,?) ON CONFLICT(employee_number) DO UPDATE SET name=excluded.name, department=excluded.department,
      category=excluded.category, position=excluded.position, email=excluded.email, status=excluded.status, active=1, synced_at=excluded.synced_at`);
    let n = 0, failed = 0;
    for (const num of wanted) {
      try {
        const root = await client.getParsed(`/api/employees/${encodeURIComponent(num)}`);
        const e = arr(root?.employee)[0];
        if (!e) { failed++; continue; }
        up.run(num, clean(e.employee_name), clean(e.employee_department), clean(e.employee_category),
          clean(e.employee_position), clean(e.email), bool(e.status), new Date().toISOString());
        n++;
      } catch (err) {
        failed++;
        log.error(`[sync] employee ${num}: ${err.message}`);
      }
    }
    if (!n) throw new Error('Could not read any employee');
    if (failed) log.warn?.(`[sync] employees: ${failed} failed`);
    return n;
  },
};

export const ORDER = ['batches', 'grading', 'students', 'subjects', 'employees'];

export function activeBatches(db) {
  return db.prepare('SELECT * FROM fedena_batches WHERE active = 1 AND (end_date IS NULL OR end_date >= ?) ORDER BY course_code, name').all(todayStr());
}

/** Runs the requested entities in dependency order and records every run in sync_runs. */
export async function runSync({ db, client, only, log = console }) {
  const wanted = ORDER.filter((e) => !only || only.includes(e));
  const results = [];
  for (const entity of wanted) {
    const started = new Date().toISOString();
    const id = Number(db.prepare('INSERT INTO sync_runs (entity, started_at) VALUES (?,?)').run(entity, started).lastInsertRowid);
    try {
      const count = await SYNCS[entity]({ db, client, log });
      db.prepare("UPDATE sync_runs SET status='ok', finished_at=?, item_count=? WHERE id=?").run(new Date().toISOString(), count, id);
      results.push({ entity, ok: true, count });
      log.log?.(`[sync] ${entity}: ok (${count})`);
    } catch (err) {
      db.prepare("UPDATE sync_runs SET status='error', finished_at=?, message=? WHERE id=?").run(new Date().toISOString(), String(err.message).slice(0, 500), id);
      results.push({ entity, ok: false, error: err.message });
      log.error?.(`[sync] ${entity}: FAILED — ${err.message}`);
    }
  }
  return results;
}
