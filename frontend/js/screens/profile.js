import { h, icon, initials, confirmSheet } from '../ui.js';
import { t, lang, setLang, themePref, setTheme } from '../i18n.js';
import { api } from '../api.js';

export function render(root, ctx) {
  root.className = 'screen';
  const u = ctx.user;

  const seg = (items, current, onPick) => {
    const wrap = h('div', { class: 'seg' });
    const paint = (cur) => wrap.replaceChildren(...items.map(([val, label]) =>
      h('button', { 'aria-pressed': String(val === cur), onclick: () => { onPick(val); paint(val); } }, label)));
    paint(current);
    return wrap;
  };

  const langSeg = seg([['en', 'English'], ['ar', 'العربية']], lang(), (v) => {
    setLang(v);
    api.setLang(v).catch(() => {});
  });
  const themeSeg = seg([['auto', t('prof.auto')], ['light', t('prof.light')], ['dark', t('prof.dark')]], themePref(), (v) => setTheme(v));

  root.append(
    h('div', { class: 'profile-head rise' },
      h('div', { class: 'avatar lg' }, initials(u.name)),
      h('h1', {}, u.name),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' } },
        h('span', { class: 'chip brand' }, t(`role.${u.role}`)),
        h('span', { class: 'chip mute num' }, u.login))),
    h('div', { style: { height: '14px' } }),
    h('div', { class: 'card list rise', style: { '--i': 1 } },
      h('div', { class: 'setting' }, h('div', { class: 'l' }, h('span', { class: 'ic' }, icon('globe')), h('div', {}, t('prof.language'), h('small', {}, t('prof.languageSub')))), langSeg),
      h('div', { class: 'setting' }, h('div', { class: 'l' }, h('span', { class: 'ic' }, icon('moon')), h('div', {}, t('prof.appearance'))), themeSeg)),
    h('div', { style: { height: '14px' } }),
    h('div', { class: 'card list rise', style: { '--i': 2 } },
      h('button', { class: 'setting', onclick: () => ctx.go('#/password') },
        h('div', { class: 'l' }, h('span', { class: 'ic' }, icon('shield')), h('div', {}, t('prof.security'), h('small', {}, t('prof.securitySub')))),
        icon('chevron', 'flip-rtl muted'))),
    h('div', { style: { height: '14px' } }),
    h('button', { class: 'btn danger block rise', style: { '--i': 3 }, onclick: async () => {
      const ok = await confirmSheet({ title: t('prof.logoutQ'), text: t('prof.logoutSub'), confirmLabel: t('prof.logout'), cancelLabel: t('prof.cancel') });
      if (ok) ctx.logout();
    } }, icon('logout'), t('prof.logout')),
    h('p', { class: 'muted', style: { textAlign: 'center', fontSize: '12px', marginTop: '22px' } }, `${t('school')} · v0.1`));
}
