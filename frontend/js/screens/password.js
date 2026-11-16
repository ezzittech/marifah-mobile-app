import { h, icon, toast } from '../ui.js';
import { t } from '../i18n.js';
import { api } from '../api.js';
import { saveSession, getSession, updateUser } from '../auth.js';
import { errText } from './login.js';

export function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return pw.length ? Math.max(1, s) : 0;
}

export function render(root, ctx) {
  const forced = ctx.user.must_change_password;
  root.className = `screen${forced ? ' no-tabs' : ''}`;

  const mk = (id, ph) => h('input', { id, type: 'password', placeholder: ph, autocomplete: id === 'pw-cur' ? 'current-password' : 'new-password', required: true });
  const cur = mk('pw-cur', '••••••••'), nw = mk('pw-new', '••••••••'), cf = mk('pw-cf', '••••••••');
  const bars = h('div', { class: 'strength', 'data-level': '0' }, h('i'), h('i'), h('i'), h('i'));
  nw.addEventListener('input', () => { bars.dataset.level = String(strength(nw.value)); });
  const err = h('div', { class: 'err-msg', hidden: true, role: 'alert', style: { background: 'var(--err-bg)', color: 'var(--err)', padding: '10px 14px', borderRadius: '12px', fontWeight: 600, fontSize: '13.5px', marginBottom: '14px' } });
  const btn = h('button', { type: 'submit', class: 'btn primary block' }, h('span', { class: 'spin' }), h('span', { class: 'lbl' }, t('pw.save')));
  const field = (label, input) => h('div', { class: 'field' }, h('label', { for: input.id }, label), h('div', { class: 'wrap' }, icon('lock'), input));

  const form = h('form', { novalidate: true },
    err, field(t('pw.current'), cur), field(t('pw.new'), nw), bars,
    h('p', { class: 'hint muted', style: { fontSize: '12.5px', margin: '8px 0 14px' } }, t('pw.hint')),
    field(t('pw.confirm'), cf), btn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    if (nw.value.length < 8) return fail(t('pw.short'));
    if (nw.value !== cf.value) return fail(t('pw.mismatch'));
    btn.classList.add('loading'); btn.disabled = true;
    try {
      const res = await api.changePassword(cur.value, nw.value);
      saveSession({ ...getSession(), token: res.token });
      updateUser({ must_change_password: false });
      toast(t('pw.done'), 'success');
      ctx.go('#/home');
    } catch (ex) {
      fail(errText(ex));
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  root.append(
    h('div', { class: 'pw-head rise' },
      !forced && h('button', { class: 'icon-btn flip-rtl', 'aria-label': t('common.back'), onclick: () => ctx.go('#/profile') }, icon('back')),
      h('h1', { class: 'page-title', style: { margin: 0, fontSize: '24px' } }, t('pw.title'))),
    forced && h('div', { class: 'banner warn rise', style: { marginBottom: '16px' } }, icon('alert'), t('pw.forced')),
    h('div', { class: 'card rise', style: { '--i': 1 } }, form));
}
