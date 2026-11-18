import test from 'node:test';
import assert from 'node:assert/strict';
import { parseXml, arr, clean } from '../src/fedena/xml.js';
import { fetchAllItems } from '../src/fedena/client.js';
import { runSync, splitBatchName } from '../src/fedena/sync.js';
import { openDb } from '../src/db.js';
import { getStudentOverview } from '../src/services/student.js';

/* Real response shapes captured from erp.marifah.edu.my (trimmed) */
const SUBJECTS_G11 = `<?xml version="1.0" encoding="UTF-8"?>
<subject_detail><subject><name>English Language</name><code>ENG</code><batch>G11 - A2 26/27</batch><no_exams>false</no_exams><max_weekly_classes>8</max_weekly_classes><credit_hours></credit_hours><elective_group></elective_group><assigned_students></assigned_students><assigned_employees><employee_number>t0019</employee_number></assigned_employees><is_floating_elective>false</is_floating_elective></subject><subject><name>Holy Quran&#8206;</name><code>HQ</code><batch>G11 - A2 26/27</batch><no_exams>false</no_exams><max_weekly_classes>2</max_weekly_classes><credit_hours></credit_hours><elective_group></elective_group><assigned_students></assigned_students><assigned_employees><employee_number>t0020</employee_number><employee_number>T0045</employee_number></assigned_employees><is_floating_elective>false</is_floating_elective></subject><subject><name>Physical Education</name><code>PE</code><batch>G11 - A2 26/27</batch><no_exams>true</no_exams><max_weekly_classes>1</max_weekly_classes><credit_hours></credit_hours><elective_group></elective_group><assigned_students></assigned_students><assigned_employees></assigned_employees><is_floating_elective>false</is_floating_elective></subject></subject_detail>`;
const STUDENTS = `<?xml version="1.0" encoding="UTF-8"?>
<student_detail><student><admission_no>s0233</admission_no><student_name>Dalal Fathey</student_name><batch_name>G11 - A2 26/27</batch_name><biometric_id></biometric_id></student><student><admission_no>s0300</admission_no><student_name>Other Student</student_name><batch_name>G10 - A1 26/27</batch_name><biometric_id></biometric_id></student></student_detail>`;
const BATCHES = `<?xml version="1.0" encoding="UTF-8"?>
<batch_detail><batch><name>A2 26/27</name><course_code>G11</course_code><start_date>2026-07-25 00:00:00 UTC</start_date><end_date>2099-06-30 00:00:00 UTC</end_date></batch><batch><name>A1 26/27</name><course_code>G10</course_code><start_date>2026-07-25 00:00:00 UTC</start_date><end_date>2099-06-30 00:00:00 UTC</end_date></batch><batch><name>A1 20/21</name><course_code>G1</course_code><start_date>2020-07-25 00:00:00 UTC</start_date><end_date>2021-06-30 00:00:00 UTC</end_date></batch></batch_detail>`;
const GRADING = `<?xml version="1.0" encoding="UTF-8"?>
<grading_level_detail><grading_level><name>A</name><batch></batch><min_score>90.0</min_score><is_deleted>false</is_deleted><credit_points>4.0</credit_points><description>Excellent</description></grading_level><grading_level><name>F</name><batch></batch><min_score>0.0</min_score><is_deleted>false</is_deleted><credit_points>0.0</credit_points><description>Fail</description></grading_level></grading_level_detail>`;
const EMPLOYEE = (name) => `<?xml version="1.0" encoding="UTF-8"?>\n\n\n<employee_detail><employee><employee_name>${name} </employee_name><joining_date>2025-09-01</joining_date><employee_department>English Department</employee_department><employee_category>Teaching Staff</employee_category><employee_position>FTF Teacher</employee_position><email>t@example.com</email><status>true</status><date_of_birth>1997-01-17</date_of_birth><mobile>60123456789</mobile><photo><image>data:image/jpeg;base64,/9j/4AAQ
SkZJRg==</image></photo></employee></employee_detail>`;
const EMPTY = '<?xml version="1.0" encoding="UTF-8"?>\n<exam_group_detail></exam_group_detail>';

function fakeClient(overrides = {}) {
  const calls = [];
  const routes = {
    '/api/batches': () => BATCHES,
    '/api/students': () => STUDENTS,
    '/api/grading_levels': () => GRADING,
    '/api/subjects': (p) => (p['search[batch_course_code_equals]'] === 'G11' ? SUBJECTS_G11 : EMPTY),
    ...overrides,
  };
  const get = async (path, params = {}) => {
    calls.push(path);
    if (params.page && params.page > 1) return EMPTY; // list endpoints are not paginated
    if (path.startsWith('/api/employees/')) return EMPLOYEE(path.split('/').pop().toUpperCase());
    const h = routes[path];
    if (!h) throw new Error(`unexpected ${path}`);
    return h(params);
  };
  return { calls, get, getParsed: async (p, q) => parseXml(await get(p, q)) };
}

test('xml parser: structure, entities, empty and repeated elements', () => {
  const r = parseXml(SUBJECTS_G11);
  const subs = arr(r.subject);
  assert.equal(subs.length, 3);
  assert.equal(clean(subs[1].name), 'Holy Quran');                 // invisible mark removed
  assert.deepEqual(arr(subs[1].assigned_employees.employee_number), ['t0020', 'T0045']);
  assert.deepEqual(arr(subs[0].assigned_employees.employee_number), ['t0019']); // single → array
  assert.deepEqual(arr(subs[2].assigned_employees), []);                          // empty element
  assert.deepEqual(arr(parseXml(EMPTY).exam_group), []);
  assert.equal(parseXml('<a>x &amp; y &#65;</a>'), 'x & y A');
});

test('batch name splitting', () => {
  assert.deepEqual(splitBatchName('G11 - A2 26/27'), { course_code: 'G11', name: 'A2 26/27', key: 'G11|A2 26/27', full: 'G11 - A2 26/27' });
});

test('list reader stops when the endpoint is not paginated (page 2 repeats or is empty)', async () => {
  const same = { getParsed: async () => parseXml(STUDENTS) };
  assert.equal((await fetchAllItems(same, '/x', {}, 'student')).length, 2);
});

test('full sync fills the local mirror, is idempotent, and the student overview reads from it', async () => {
  const db = openDb(':memory:');
  db.prepare(`INSERT INTO users (login, role, name, password_hash, fedena_admission_no) VALUES ('s0233','student','Dalal','x','s0233')`).run();
  const client = fakeClient();
  const silent = { log() {}, error() {}, warn() {} };

  let res = await runSync({ db, client, log: silent });
  assert.deepEqual(res.map((r) => [r.entity, r.ok]), [['batches', true], ['grading', true], ['students', true], ['subjects', true], ['employees', true]]);
  res = await runSync({ db, client, log: silent }); // run again: no duplicates
  assert.ok(res.every((r) => r.ok));

  const n = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE active = 1`).get().n;
  assert.equal(n('fedena_batches'), 3);
  assert.equal(n('fedena_students'), 2);
  assert.equal(n('fedena_subjects'), 3);          // only G11 returned subjects
  assert.equal(n('fedena_employees'), 3);         // t0019, t0020, t0045 (case-folded)
  assert.equal(n('fedena_grading_levels'), 2);


  // privacy: no DOB / phone / photo columns exist
  const cols = db.prepare('PRAGMA table_info(fedena_employees)').all().map((c) => c.name);
  for (const bad of ['date_of_birth', 'mobile', 'photo', 'home_address']) assert.ok(!cols.includes(bad));

  const user = db.prepare("SELECT * FROM users WHERE login = 's0233'").get();
  const ov = getStudentOverview(db, user);
  assert.equal(ov.available, true);
  assert.equal(ov.batch.full_name, 'G11 - A2 26/27');
  assert.deepEqual(ov.subjects.map((s) => s.code), ['ENG', 'HQ', 'PE']);
  assert.equal(ov.subjects.find((s) => s.code === 'PE').graded, false);
  assert.equal(ov.subjects.find((s) => s.code === 'HQ').teachers.length, 2);
  assert.deepEqual(ov.grading_levels.map((l) => l.name), ['A', 'F']);
  assert.ok(ov.updated_at);
});

test('a failing entity is recorded and does not wipe or block others; empty lists never wipe data', async () => {
  const db = openDb(':memory:');
  const silent = { log() {}, error() {}, warn() {} };
  await runSync({ db, client: fakeClient(), log: silent });

  const broken = fakeClient({ '/api/students': () => EMPTY, '/api/batches': () => { throw new Error('boom'); } });
  const res = await runSync({ db, client: broken, only: ['batches', 'students'], log: silent });
  assert.deepEqual(res.map((r) => r.ok), [false, false]);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM fedena_students WHERE active = 1').get().n, 2); // untouched
  const last = db.prepare("SELECT status, message FROM sync_runs WHERE entity = 'batches' ORDER BY id DESC").get();
  assert.equal(last.status, 'error');
});

test('electives: a subject with an assigned list is only shown to those students', async () => {
  const db = openDb(':memory:');
  db.prepare(`INSERT INTO fedena_students (admission_no, name, batch_key, batch_full_name, synced_at) VALUES ('s1','A','G11|A2 26/27','G11 - A2 26/27','t'),('s2','B','G11|A2 26/27','G11 - A2 26/27','t')`).run();
  db.prepare(`INSERT INTO fedena_subjects (batch_key, code, name, assigned_students, employee_numbers, synced_at) VALUES ('G11|A2 26/27','ART','Art','["S1"]','[]','t'),('G11|A2 26/27','ENG','English','[]','[]','t')`).run();
  assert.deepEqual(getStudentOverview(db, { login: 's1' }).subjects.map((s) => s.code), ['ART', 'ENG']);
  assert.deepEqual(getStudentOverview(db, { login: 's2' }).subjects.map((s) => s.code), ['ENG']);
});
