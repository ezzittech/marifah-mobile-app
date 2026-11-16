import { h, icon, LOGO_SVG } from '../ui.js';
import { t, lang, setLang, setTheme } from '../i18n.js';
import { api, DEMO, ApiError } from '../api.js';
import { saveSession } from '../auth.js';

export function errText(e) {
  if (e instanceof ApiError || e?.code) {
    if (e.code === 'network') return t('err.network');
    const k = `err.${e.code}`;
    const s = t(k);
    return s === k ? t('err.generic') : s;
  }
  return t('err.generic');
}

export function render(root, ctx) {
  root.className = 'screen flush no-tabs';
  let showPw = false;

  const errBox = h('div', { class: 'err-msg', hidden: true, role: 'alert' });
  const idInput = h('input', { id: 'inp-id', type: 'text', placeholder: t('login.idPh'), autocomplete: 'username', autocapitalize: 'characters', spellcheck: 'false', inputmode: 'text', required: true });
  const pwInput = h('input', { id: 'inp-pw', type: 'password', placeholder: '••••••••', autocomplete: 'current-password', required: true });
  const eyeBtn = h('button', { type: 'button', class: 'icon-btn', style: { width: '34px', height: '34px', border: 0, background: 'none' }, 'aria-label': 'Show password' }, icon('eye'));
  eyeBtn.addEventListener('click', () => {
    showPw = !showPw;
    pwInput.type = showPw ? 'text' : 'password';
    eyeBtn.replaceChildren(icon(showPw ? 'eyeOff' : 'eye'));
  });

  const btn = h('button', { type: 'submit', class: 'btn primary block' }, h('span', { class: 'spin' }), h('span', { class: 'lbl' }, t('login.submit')));

  const form = h('form', { novalidate: true },
    errBox,
    h('div', { class: 'field' },
      h('label', { for: 'inp-id' }, t('login.id')),
      h('div', { class: 'wrap' }, icon('id'), idInput)),
    h('div', { class: 'field' },
      h('label', { for: 'inp-pw' }, t('login.pw')),
      h('div', { class: 'wrap' }, icon('lock'), pwInput, eyeBtn)),
    h('div', { style: { height: '6px' } }),
    btn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    const login = idInput.value.trim(), pw = pwInput.value;
    if (!login || !pw) { errBox.textContent = t('login.required'); errBox.hidden = false; return; }
    btn.classList.add('loading'); btn.disabled = true;
    try {
      const res = await api.login(login, pw);
      saveSession({ token: res.token, user: res.user });
      ctx.go(res.user.must_change_password ? '#/password' : '#/home');
    } catch (err) {
      errBox.textContent = errText(err); errBox.hidden = false;
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  const themeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Theme', onclick: () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    setTheme(dark ? 'light' : 'dark');
    themeBtn.replaceChildren(icon(dark ? 'moon' : 'sun'));
  } }, icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'));
  const langBtn = h('button', { class: 'icon-btn lang-btn', onclick: () => setLang(lang() === 'en' ? 'ar' : 'en') }, lang() === 'en' ? 'عربي' : 'EN');

  root.append(h('div', { class: 'login' },
    h('div', { class: 'pattern' }), h('div', { class: 'blob b1' }), h('div', { class: 'blob b2' }),
    h('div', { class: 'top' }, themeBtn, langBtn),
    h('div', { class: 'hero' },
      h('div', { class: 'logo-ring rise', style: { '--i': 0 }, html: LOGO_SVG }),
      h('h1', { class: 'rise', style: { '--i': 1 } }, t('appName')),
      h('p', { class: 'rise', style: { '--i': 2 } }, t('school'))),
    h('div', { class: 'sheet-card' },
      h('h2', {}, t('login.welcome')),
      h('p', { class: 'sub' }, DEMO ? t('login.demo') : t('login.sub')),
      form,
      h('p', { class: 'help' }, t('login.help')))));
}
