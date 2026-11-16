import { h, icon } from './ui.js';
import { t, applyLang, applyTheme } from './i18n.js';
import { getSession, clearSession } from './auth.js';
import { clearCache, DEMO } from './api.js';

applyTheme();
applyLang();

const SCREENS = {
  login: () => import('./screens/login.js'),
  home: () => import('./screens/home.js'),
  finance: () => import('./screens/finance.js'),
  academic: () => import('./screens/academic.js'),
  profile: () => import('./screens/profile.js'),
  password: () => import('./screens/password.js'),
};
const TABS = [['home', 'home', 'nav.home'], ['finance', 'wallet', 'nav.finance'], ['academic', 'book', 'nav.academic'], ['profile', 'user', 'nav.profile']];

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let renderId = 0;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || '';
  const [name, qs] = raw.split('?');
  return { name, params: new URLSearchParams(qs || '') };
}

export function go(hash) {
  if (location.hash === hash) render(); else location.hash = hash;
}

function logout() {
  clearSession();
  clearCache();
  go('#/login');
}

function buildTabs(active) {
  const idx = Math.max(0, TABS.findIndex(([n]) => n === active));
  tabbar.replaceChildren(
    h('i', { class: 'indicator', style: { '--i': idx } }),
    ...TABS.map(([name, ic, label]) =>
      h('button', { class: 'tab', 'aria-current': name === active ? 'page' : null, onclick: () => go(`#/${name}`) }, icon(ic), t(label))));
}

async function render() {
  const id = ++renderId;
  const session = getSession();
  let { name, params } = parseHash();

  // route guards
  if (!session) name = 'login';
  else if (session.user.must_change_password) name = 'password';
  else if (!SCREENS[name] || name === 'login') name = 'home';
  const want = `#/${name}${params.toString() ? `?${params}` : ''}`;
  if (location.hash.split('?')[0] !== `#/${name}`) history.replaceState(null, '', want);

  const mod = await SCREENS[name]();
  if (id !== renderId) return; // a newer navigation won

  const root = h('div', { class: 'screen' });
  const ctx = { go, logout, params, user: session?.user, refresh: render };
  view.replaceChildren(root);
  mod.render(root, ctx);
  window.scrollTo(0, 0);

  const showTabs = !!session && !session.user.must_change_password && name !== 'password' && name !== 'login';
  tabbar.hidden = !showTabs;
  if (showTabs) buildTabs(name);
  document.title = t('school');
}

window.addEventListener('hashchange', render);
window.addEventListener('langchange', render);
window.addEventListener('session-expired', () => go('#/login'));
window.addEventListener('online', () => { /* screens retry via pull / revisit */ });

render();

if ('serviceWorker' in navigator && !DEMO && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
