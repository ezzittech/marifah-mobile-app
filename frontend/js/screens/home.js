import { h, icon, ring, countUp, fmtMoney, fmtNum, greeting, initials, meter, scoreColor, sk, LOGO_SVG } from '../ui.js';
import { t, subjectName, setLang, lang } from '../i18n.js';
import { api, swr } from '../api.js';
import { slotRow, todayKey } from './academic.js';

export function render(root, ctx) {
  root.className = 'screen';
  const u = ctx.user;
  const content = h('div');

  const langBtn = h('button', { class: 'icon-btn lang-btn', style: { width: 'auto', paddingInline: '12px', fontWeight: 800, fontSize: '13px' }, onclick: () => setLang(lang() === 'en' ? 'ar' : 'en') }, lang() === 'en' ? 'عربي' : 'EN');

  root.append(
    h('div', { class: 'topbar rise' },
      h('div', { class: 'avatar' }, initials(u.name)),
      h('div', { class: 'who' }, h('small', {}, greeting()), h('b', {}, u.name.split(' ')[0])),
      langBtn),
    content);

  const state = { fin: null, acad: null };

  function idCard() {
    const due = state.fin ? state.fin.total_due : null;
    const amount = h('b', { class: 'num' }, due == null ? '—' : fmtMoney(0));
    if (due != null) countUp(amount, due, { format: (v) => fmtMoney(v) });
    return h('div', { class: 'idcard rise', style: { '--i': 1 } },
      h('div', { class: 'row1' },
        h('div', { class: 'school' }, h('span', { html: LOGO_SVG, style: { display: 'inline-flex' } }), t('appName')),
        h('span', { class: 'chip' }, t(`role.${u.role}`))),
      h('div', { class: 'name' }, u.name),
      h('div', { class: 'sid num' }, `${t('home.studentId')} · ${u.login}`),
      u.has_finance && h('div', { class: 'foot' },
        h('div', {}, h('small', {}, t('home.balance')), amount),
        due > 0
          ? h('button', { class: 'btn', onclick: () => ctx.go('#/finance') }, t('home.payNow'), icon('chevron', 'flip-rtl'))
          : due === 0 ? h('span', { class: 'chip' }, icon('check'), t('home.allPaid')) : sk('90px', 36)));
  }

  function quick() {
    const item = (ic, tone, label, onClick, soon) => h('button', { onclick: onClick, disabled: soon }, h('span', { class: `q-ic ${tone}` }, icon(ic)), label, soon && h('span', { class: 'chip mute soon' }, t('quick.soon')));
    return h('div', { class: 'quick rise', style: { '--i': 2 } },
      item('wallet', '', t('quick.pay'), () => ctx.go('#/finance')),
      item('bars', 'o', t('quick.grades'), () => ctx.go('#/academic')),
      item('calendar', 'b', t('quick.timetable'), () => ctx.go('#/academic?tab=timetable')),
      item('file', 'g', t('quick.report'), null, true));
  }

  function stats() {
    const s = state.acad?.summary;
    if (!s) return h('div', { class: 'stats', style: { marginTop: '18px' } }, [0, 1].map(() => h('div', { class: 'card stat' }, sk('96px', 96), sk('60%'))));
    const att = ring({ value: s.attendance_rate, size: 96, stroke: 10, color: 'var(--ok)', label: `${Math.round(s.attendance_rate)}%` });
    const avgNum = h('span', { class: 'num' }, '0');
    const avg = ring({ value: s.average, size: 96, stroke: 10, color: scoreColor(s.average), label: '' });
    avg.mid.firstChild.replaceChildren(avgNum);
    countUp(avgNum, s.average, { decimals: 1 });
    return h('div', { class: 'stats rise', style: { marginTop: '18px', '--i': 3 } },
      h('div', { class: 'card stat' }, att.el, h('b', {}, t('home.attendance'))),
      h('div', { class: 'card stat' }, avg.el, h('b', {}, t('home.average'))));
  }

  function today() {
    const a = state.acad;
    const head = h('div', { class: 'section-title' }, h('h2', {}, t('home.today')), h('button', { onclick: () => ctx.go('#/academic?tab=timetable') }, t('home.timetable')));
    if (!a) return h('div', {}, head, h('div', { class: 'card' }, sk('70%'), h('div', { style: { height: '10px' } }), sk('50%')));
    const list = a.timetable[todayKey()] || [];
    return h('div', { class: 'rise', style: { '--i': 4 } }, head,
      list.length
        ? h('div', { class: 'timeline' }, list.map((s) => slotRow(s, true)))
        : h('div', { class: 'card empty' }, h('div', { class: 'badge' }, icon('calendar')), h('h3', {}, t('home.noClasses')), h('p', {}, t('home.noClassesSub'))));
  }

  function subjects() {
    const a = state.acad;
    if (!a) return h('div');
    return h('div', { class: 'rise', style: { '--i': 5 } },
      h('div', { class: 'section-title' }, h('h2', {}, t('home.recentGrades')), h('button', { onclick: () => ctx.go('#/academic') }, t('home.seeAll'))),
      h('div', { class: 'stack' }, a.grades.slice(0, 4).map((g) =>
        h('div', { class: 'card grade-row' },
          h('b', {}, subjectName(g.subject)),
          h('span', { class: 'score num', style: { color: scoreColor(g.score) } }, `${fmtNum(g.score)} · ${g.grade}`),
          meter(g.score, scoreColor(g.score))))));
  }

  let first = true;
  function paint() {
    content.replaceChildren(idCard(), quick(), stats(), today(), subjects());
    if (!first) content.querySelectorAll('.rise').forEach((el) => { el.style.animation = 'none'; });
    first = false;
  }

  paint();
  const jobs = [];
  if (u.has_finance) jobs.push(swr('finance', api.finance, (d) => { state.fin = d; paint(); }).catch(() => {}));
  if (['student', 'parent', 'admin'].includes(u.role)) jobs.push(swr('academic', api.academic, (d) => { state.acad = d; paint(); }).catch(() => {}));
}
