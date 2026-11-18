/** Reads the student's data from OUR copy of Fedena (never calls Fedena at request time). */
export function getStudentOverview(db, user) {
  const adm = user.fedena_admission_no || user.login;
  const st = db.prepare('SELECT * FROM fedena_students WHERE admission_no = ? AND active = 1').get(adm);
  if (!st) return { available: false };

  const batch = db.prepare('SELECT * FROM fedena_batches WHERE batch_key = ?').get(st.batch_key) || null;
  const rows = db.prepare('SELECT * FROM fedena_subjects WHERE batch_key = ? AND active = 1 ORDER BY name').all(st.batch_key);
  const teacherOf = db.prepare('SELECT name, department FROM fedena_employees WHERE employee_number = ?');

  const me = adm.toLowerCase();
  const subjects = rows
    // elective subjects list their students; ordinary subjects have an empty list = whole batch
    .filter((r) => {
      const assigned = JSON.parse(r.assigned_students).map((s) => String(s).toLowerCase());
      return assigned.length === 0 || assigned.includes(me);
    })
    .map((r) => ({
      code: r.code,
      name: r.name,
      weekly_classes: r.max_weekly_classes,
      graded: !r.no_exams,
      elective: !!r.elective_group || !!r.is_floating_elective,
      teachers: JSON.parse(r.employee_numbers)
        .map((n) => teacherOf.get(n))
        .filter(Boolean)
        .map((t) => ({ name: t.name, department: t.department })),
    }));

  const levels = db.prepare(`SELECT name, min_score, credit_points, description FROM fedena_grading_levels
    WHERE active = 1 AND (scope = '' OR scope = ?) ORDER BY min_score DESC`).all(st.batch_full_name);

  const last = db.prepare("SELECT MAX(finished_at) AS t FROM sync_runs WHERE status = 'ok' AND entity IN ('students','subjects')").get();

  return {
    available: true,
    student: { name: st.name, admission_no: st.admission_no },
    batch: batch && {
      course_code: batch.course_code, name: batch.name, full_name: batch.full_name,
      start_date: batch.start_date, end_date: batch.end_date,
    },
    subjects,
    grading_levels: levels.map((l) => ({ ...l })),
    updated_at: last?.t || null,
  };
}
