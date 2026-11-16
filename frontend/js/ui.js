import { t, locale } from './i18n.js';

/* ───────── DOM helper (strings become text nodes → no XSS from API data) ───────── */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v; // static markup only (icons)
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk_, sv] of Object.entries(v)) {
        if (sk_.startsWith('--')) el.style.setProperty(sk_, String(sv)); else el.style[sk_] = sv;
      }
    }
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(add);
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

/* ───────── Icons (inner SVG markup, stroke style) ───────── */
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M16 15h2"/><path d="M7 6V5a2 2 0 0 1 2-2h8"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 1.5Z"/><path d="M4 19.5A2 2 0 0 0 6 21h13"/><path d="M9 7h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  bars: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.7C3.9 8.5 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 5.4-1.6 6 0M14 10h4M14 14h3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  file: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
  wifiOff: '<path d="M3 3l18 18"/><path d="M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.3M2 9.4a15 15 0 0 1 5.3-3.1M12 20h.01"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
};

export function icon(name, cls = '') {
  return h('span', { class: `icon ${cls}`.trim(), 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24">${ICONS[name] || ''}</svg>` });
}

export const LOGO_SVG = '<svg viewBox="0 0 54 46" fill="none"><polygon points="27,0 40,13 27,26 14,13" fill="#fff" opacity=".96"/><polygon points="14,13 27,26 14,39 1,26" fill="#fff" opacity=".66"/><polygon points="40,13 53,26 40,39 27,26" fill="#fff" opacity=".66"/></svg>';

/* ───────── Formatting ───────── */
export const fmtMoney = (n, cur = 'MYR') =>
  new Intl.NumberFormat(locale(), { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2 }).format(n || 0);
export const fmtNum = (n, d = 0) => new Intl.NumberFormat(locale(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(n || 0);
export function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? s : new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}
export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export function greeting() {
  const hr = new Date().getHours();
  return t(hr < 12 ? 'greet.morning' : hr < 18 ? 'greet.afternoon' : 'greet.evening');
}

/* ───────── Animated number ───────── */
export function countUp(el, to, { decimals = 0, format } = {}) {
  const fmt = format || ((v) => fmtNum(v, decimals));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 900;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ───────── Progress ring ───────── */
export function ring({ value, max = 100, size = 96, stroke = 10, color = 'var(--p)', label, sub }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const bar = h('circle', {});
  const svg = h('div', { html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/><circle class="bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg>` });
  const mid = h('div', { class: 'mid' }, label != null && h('b', { class: 'num' }, label), sub && h('small', {}, sub));
  const el = h('div', { class: 'ring', style: { width: `${size}px`, height: `${size}px` } }, svg.firstChild, mid);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const b = el.querySelector('.bar');
    if (b) b.style.strokeDashoffset = String(c * (1 - pct));
  }));
  return { el, mid };
}

export function meter(pct, color) {
  const i = h('i', color ? { style: { '--c': color } } : {});
  const el = h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': Math.round(pct), 'aria-valuemin': 0, 'aria-valuemax': 100 }, i);
  requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = `${Math.max(0, Math.min(100, pct))}%`; }));
  return el;
}

export const scoreColor = (s) => (s >= 85 ? 'var(--ok)' : s >= 70 ? 'var(--info)' : s >= 55 ? 'var(--warn)' : 'var(--err)');

/* ───────── Toast ───────── */
export function toast(msg, type = 'info') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = h('div', { class: `toast ${type}`, role: 'status' }, msg);
  wrap.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
}

/* ───────── Bottom sheet confirm ───────── */
export function confirmSheet({ title, text, confirmLabel, cancelLabel, danger = true }) {
  return new Promise((resolve) => {
    const close = (v) => { scrim.remove(); sheet.remove(); resolve(v); };
    const scrim = h('div', { class: 'scrim', onclick: () => close(false) });
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'grab' }), h('h3', {}, title), h('p', {}, text),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => close(false) }, cancelLabel),
        h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => close(true) }, confirmLabel)));
    document.body.append(scrim, sheet);
  });
}

/* ───────── Skeleton / states ───────── */
export const sk = (w = '100%', hgt = 14) => h('div', { class: 'sk', style: { width: w, height: `${hgt}px` } });

export function emptyState({ ic = 'inbox', title, text, action }) {
  return h('div', { class: 'empty' },
    h('div', { class: 'badge' }, icon(ic)), h('h3', {}, title), text && h('p', {}, text),
    action && h('button', { class: 'btn soft sm', onclick: action.onClick }, icon('refresh'), action.label));
}

export function errorState(onRetry, offline = false) {
  return emptyState({
    ic: offline ? 'wifiOff' : 'alert',
    title: offline ? t('common.offline') : t('common.loadFail'),
    text: t('common.loadFailSub'),
    action: { label: t('common.retry'), onClick: onRetry },
  });
}
