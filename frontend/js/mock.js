// Built-in sample data for ?demo preview (GitHub Pages) — mirrors the real API shapes.
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const user = { id: 1, login: 'MIS0529', role: 'student', name: 'Yusuf Ahmad Al-Hakim', lang: 'en', must_change_password: false, has_finance: true };

const SUBJ = [
  ['English Language', 'ENG', 88], ['Arabic Language', 'ARL', 92], ['Mathematics', 'MATH', 90], ['Biology', 'BIO', 76],
  ['Chemistry', 'CHEM', 81], ['Physics', 'PHY', 85], ['Holy Quran', 'HQ', 95], ['Islamic Studies', 'ISC', 89],
  ['Information and Communications Technology', 'ICT', 94], ['Geography', 'GEO', 79],
];
const gradeOf = (s) => (s >= 90 ? 'A+' : s >= 85 ? 'A' : s >= 80 ? 'B+' : s >= 75 ? 'B' : 'C');
const name = (c) => SUBJ.find((s) => s[1] === c)[0];
const slot = (start, end, code, room) => ({ start, end, room, code, subject: name(code) });

const dayOffset = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

export const api = {
  async login(login, password) {
    await wait(700);
    if (!login || !password) throw Object.assign(new Error('x'), { code: 'invalid_credentials' });
    return { success: true, token: 'demo', user: { ...user, login: login.toUpperCase() } };
  },
  async me() { return { success: true, user }; },
  async finance() {
    await wait();
    const invoices = [
      { id: 'INV/2026/0412', title: 'Tuition Fee — Term 2', date: dayOffset(-40), due_date: dayOffset(-5), amount: 2400, residual: 1200, status: 'partial', overdue: true },
      { id: 'INV/2026/0533', title: 'Transport Fee — Term 2', date: dayOffset(-12), due_date: dayOffset(14), amount: 450, residual: 450, status: 'unpaid', overdue: false },
      { id: 'INV/2026/0101', title: 'Tuition Fee — Term 1', date: dayOffset(-160), due_date: dayOffset(-130), amount: 2400, residual: 0, status: 'paid', overdue: false },
      { id: 'INV/2026/0102', title: 'Registration & Books', date: dayOffset(-175), due_date: dayOffset(-150), amount: 680, residual: 0, status: 'paid', overdue: false },
    ];
    const billed = invoices.reduce((s, i) => s + i.amount, 0);
    const due = invoices.reduce((s, i) => s + i.residual, 0);
    return { success: true, currency: 'MYR', total_billed: billed, total_due: due, total_paid: billed - due, overdue_count: 1, invoices };
  },
  async pay() { await wait(500); throw Object.assign(new Error('demo'), { code: 'demo' }); },
  async academic() {
    await wait();
    return {
      success: true, demo: true,
      summary: { average: 86.9, attendance_rate: 94.5, days_present: 52, days_absent: 3 },
      grades: SUBJ.map(([subject, code, score]) => ({ subject, code, score, grade: gradeOf(score) })),
      timetable: {
        sun: [slot('08:00', '08:45', 'ENG', 'A1'), slot('08:50', '09:35', 'MATH', 'A1'), slot('10:00', '10:45', 'ARL', 'A1'), slot('10:50', '11:35', 'PHY', 'Lab 2')],
        mon: [slot('08:00', '08:45', 'ARL', 'A1'), slot('08:50', '09:35', 'ENG', 'A1'), slot('10:00', '10:45', 'BIO', 'Lab 1'), slot('10:50', '11:35', 'ISC', 'A1')],
        tue: [slot('08:00', '08:45', 'MATH', 'A1'), slot('08:50', '09:35', 'CHEM', 'Lab 3'), slot('10:00', '10:45', 'HQ', 'A1'), slot('10:50', '11:35', 'GEO', 'A1')],
        wed: [slot('08:00', '08:45', 'ENG', 'A1'), slot('08:50', '09:35', 'PHY', 'Lab 2'), slot('10:00', '10:45', 'ICT', 'ICT Lab'), slot('10:50', '11:35', 'ARL', 'A1')],
        thu: [slot('08:00', '08:45', 'ISC', 'A1'), slot('08:50', '09:35', 'MATH', 'A1'), slot('10:00', '10:45', 'ENG', 'A1'), slot('10:50', '11:35', 'BIO', 'Lab 1')],
      },
    };
  },
  async overview() {
    await wait();
    const teachers = { ENG: 'Omnia Fadel', ARL: 'Hana Saleh', MATH: 'Khalid Nasser', BIO: 'Sara Omar', CHEM: 'Ali Hassan', PHY: 'Yahya Ahmed', HQ: 'Ibrahim Yusuf', ISC: 'Ibrahim Yusuf', ICT: 'Mariam Adel', GEO: 'Noor Fahd' };
    return {
      success: true, available: true, student: { name: user.name, admission_no: user.login },
      batch: { course_code: 'G11', name: 'A2 26/27', full_name: 'G11 - A2 26/27', start_date: '2026-07-25', end_date: '2027-06-30' },
      subjects: SUBJ.map(([subject, code]) => ({ code, name: subject, weekly_classes: 3 + (code.length % 4), graded: true, elective: false, teachers: [{ name: teachers[code], department: '' }] })),
      grading_levels: [], updated_at: new Date().toISOString(),
    };
  },
  async changePassword() { await wait(500); return { success: true, token: 'demo' }; },
  async setLang() { return { success: true }; },
};
