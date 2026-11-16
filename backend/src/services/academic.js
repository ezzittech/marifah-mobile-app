/**
 * Academic data.
 * PHASE 2 will replace this with the Fedena adapter (grades, subjects, timetable).
 * Until then the API returns clearly-flagged DEMO data (demo: true) so the UI can be
 * built and reviewed. The subjects below are the real G10 subjects from Fedena.
 */
const SUBJECTS = [
  ['English Language', 'ENG'], ['Arabic Language', 'ARL'], ['Mathematics', 'MATH'],
  ['Biology', 'BIO'], ['Chemistry', 'CHEM'], ['Physics', 'PHY'],
  ['Holy Quran', 'HQ'], ['Islamic Studies', 'ISC'], ['Information and Communications Technology', 'ICT'],
  ['Geography', 'GEO'],
];
const SCORES = [88, 92, 90, 76, 81, 85, 95, 89, 94, 79];
const gradeOf = (s) => (s >= 90 ? 'A+' : s >= 85 ? 'A' : s >= 80 ? 'B+' : s >= 75 ? 'B' : s >= 65 ? 'C' : 'D');

export function getAcademic() {
  const grades = SUBJECTS.map(([subject, code], i) => ({
    subject, code, score: SCORES[i], grade: gradeOf(SCORES[i]),
  }));
  const average = Math.round((SCORES.reduce((a, b) => a + b, 0) / SCORES.length) * 10) / 10;
  const slot = (start, end, code, room) => ({
    start, end, room, subject: SUBJECTS.find((s) => s[1] === code)?.[0] || code, code,
  });
  const timetable = {
    sun: [slot('08:00', '08:45', 'ENG', 'A1'), slot('08:50', '09:35', 'MATH', 'A1'), slot('10:00', '10:45', 'ARL', 'A1'), slot('10:50', '11:35', 'PHY', 'Lab 2')],
    mon: [slot('08:00', '08:45', 'ARL', 'A1'), slot('08:50', '09:35', 'ENG', 'A1'), slot('10:00', '10:45', 'BIO', 'Lab 1'), slot('10:50', '11:35', 'ISC', 'A1')],
    tue: [slot('08:00', '08:45', 'MATH', 'A1'), slot('08:50', '09:35', 'CHEM', 'Lab 3'), slot('10:00', '10:45', 'HQ', 'A1'), slot('10:50', '11:35', 'GEO', 'A1')],
    wed: [slot('08:00', '08:45', 'ENG', 'A1'), slot('08:50', '09:35', 'PHY', 'Lab 2'), slot('10:00', '10:45', 'ICT', 'ICT Lab'), slot('10:50', '11:35', 'ARL', 'A1')],
    thu: [slot('08:00', '08:45', 'ISC', 'A1'), slot('08:50', '09:35', 'MATH', 'A1'), slot('10:00', '10:45', 'ENG', 'A1'), slot('10:50', '11:35', 'BIO', 'Lab 1')],
  };
  return {
    demo: true,
    source: 'placeholder (Fedena sync arrives in phase 2)',
    summary: { average, attendance_rate: 94.5, days_present: 52, days_absent: 3 },
    grades,
    timetable,
  };
}
