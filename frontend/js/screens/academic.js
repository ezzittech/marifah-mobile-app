import { h, icon, ring, meter, countUp, fmtNum, scoreColor, sk, errorState } from '../ui.js';
import { t, subjectName } from '../i18n.js';
import { api, swr } from '../api.js';

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const todayKey = () => DAY_KEYS[new Date().getDay()];
const PALETTE = ['#7a1228', '#3b6fd8', '#0f9d6b', '#c77d06', '#8a4fd6', '#d3364b', '#0e8fa8', '#6b7a1f', '#c2528a', '#4a5568'];
export const subjectColor = (code = '') => PALETTE[[...code].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const toMin = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };

export function slotRow(s, isToday) {
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  const live = isToday && nm >= toMin(s.start) && nm < toMin(s.end);
  return h('div', { class: `slot${live ? ' now' : ''}` },
    h('div', { class: 'time num' }, s.start),
    h('div', { class: 'box', style: { '--c': subjectColor(s.code) } },
      h('b', {}, subjectName(s.subject)),
      h('small', {}, `${s.start} – ${s.end}${s.room ? ` · ${s.room}` : ''}`),
      live && h('span', { class: 'chip brand live' }, t('home.now'))));
}

export function render(root, ctx) {
  root.className = 'screen';
  let tab = ctx.params.get('tab') === 'timetable' ? 'timetable' : 'grades';
  let day = todayKey();
  let data = null;

  const body = h('div');
  const segGrades = h('button', { 'aria-pressed': 'true' }, t('acad.grades'));
  const segTime = h('button', { 'aria-pressed': 'false' }, t('acad.timetable'));
  const seg = h('div', { class: 'seg rise', style: { '--i': 1, marginBottom: '16px' } }, segGrades, segTime);
  const setTab = (v) => {
    tab = v;
    segGrades.setAttribute('aria-pressed', String(v === 'grades'));
    segTime.setAttribute('aria-pressed', String(v === 'timetable'));
    paint();
  };
  segGrades.onclick = () => setTab('grades');
  segTime.onclick = () => setTab('timetable');
  segGrades.setAttribute('aria-pressed', String(tab === 'grades'));
  segTime.setAttribute('aria-pressed', String(tab === 'timetable'));

  root.append(
    h('h1', { class: 'page-title rise' }, t('acad.title')),
    h('p', { class: 'page-sub rise', style: { '--i': 0 } }, t('acad.sub')),
    seg, body);

  function skeleton() {
    body.replaceChildren(
      h('div', { class: 'card' }, h('div', { style: { display: 'flex', gap: '16px', alignItems: 'center' } }, sk('96px', 96), h('div', { style: { flex: 1, display: 'grid', gap: '10px' } }, sk('80%'), sk('60%'), sk('70%')))),
      h('div', { style: { height: '12px' } }),
      ...[0, 1, 2, 3].map(() => h('div', { class: 'card', style: { marginBottom: '10px' } }, sk('55%'), h('div', { style: { height: '10px' } }), sk('100%', 8))));
  }

  function paintGrades() {
    const { summary, grades } = data;
    const avgNum = h('span', { class: 'num' }, '0');
    const r = ring({ value: summary.average, size: 108, stroke: 11, color: scoreColor(summary.average), label: '', sub: '%' });
    r.mid.firstChild.replaceChildren(avgNum);
    countUp(avgNum, summary.average, { decimals: 1 });
    const att = Math.round(summary.attendance_rate);
    body.replaceChildren(
      h('div', { class: 'card avg-hero rise' }, r.el,
        h('div', { class: 'meta' },
          h('b', { style: { fontSize: '16px' } }, t('acad.average')),
          h('div', { class: 'line' }, h('span', {}, t('home.attendance')), h('b', { class: 'num' }, `${att}%`)),
          h('div', { class: 'line' }, h('span', {}, t('acad.present')), h('b', { class: 'num' }, fmtNum(summary.days_present))),
          h('div', { class: 'line' }, h('span', {}, t('acad.absent')), h('b', { class: 'num' }, fmtNum(summary.days_absent))))),
      h('div', { style: { height: '14px' } }),
      h('div', { class: 'stack' }, grades.map((g, i) =>
        h('div', { class: 'card grade-row rise', style: { '--i': i + 1 } },
          h('b', {}, subjectName(g.subject)),
          h('span', { class: 'score num', style: { color: scoreColor(g.score) } }, `${fmtNum(g.score)} · ${g.grade}`),
          meter(g.score, scoreColor(g.score))))));
  }

  function paintTimetable() {
    const tt = data.timetable;
    const keys = Object.keys(tt);
    if (!keys.includes(day)) day = keys[0];
    const tk = todayKey();
    const days = h('div', { class: 'days', style: { gridTemplateColumns: `repeat(${keys.length}, 1fr)` } }, keys.map((k) =>
      h('button', { class: 'day', 'aria-pressed': String(k === day), onclick: () => { day = k; paintTimetable(); } },
        t(`day.${k}`).slice(0, 3), h('b', { class: 'num' }, String(tt[k].length)), k === tk && h('i', { class: 'dot' }))));
    const list = tt[day] || [];
    body.replaceChildren(days, h('div', { style: { height: '16px' } }),
      list.length
        ? h('div', { class: 'timeline' }, list.map((s) => slotRow(s, day === tk)))
        : h('div', { class: 'card empty' }, h('p', {}, t('acad.noClasses'))));
  }

  function paint() {
    if (!data) return;
    const banner = data.demo ? h('div', { class: 'banner info rise', style: { marginBottom: '14px' } }, icon('info'), t('acad.preview')) : null;
    tab === 'grades' ? paintGrades() : paintTimetable();
    if (banner) body.prepend(banner);
  }

  const load = () => {
    if (!data) skeleton();
    swr('academic', api.academic, (d) => { data = d; paint(); })
      .catch((e) => body.replaceChildren(errorState(load, e?.code === 'network')));
  };
  load();
}
