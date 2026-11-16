import { getSession, clearSession } from './auth.js';
import * as mock from './mock.js';

const cfg = window.MARIFAH_CONFIG || {};
export const DEMO = cfg.DEMO === true || new URLSearchParams(location.search).has('demo');
const BASE = (cfg.API_BASE || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status; }
}

async function request(path, { method = 'GET', body } = {}) {
  const s = getSession();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('network', 'network', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    if (res.status === 401 && json.code === 'unauthorized') {
      clearSession();
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    throw new ApiError(json.code || 'generic', json.message || 'Request failed', res.status);
  }
  return json;
}

const real = {
  login: (login, password) => request('/api/auth/login', { method: 'POST', body: { login, password } }),
  me: () => request('/api/me'),
  finance: () => request('/api/finance'),
  pay: (invoice_id) => request('/api/finance/pay', { method: 'POST', body: { invoice_id } }),
  academic: () => request('/api/academic'),
  changePassword: (current_password, new_password) =>
    request('/api/auth/change-password', { method: 'POST', body: { current_password, new_password } }),
  setLang: (lang) => request('/api/me/lang', { method: 'POST', body: { lang } }),
};

export const api = DEMO ? mock.api : real;

/* ───────── stale-while-revalidate cache (in memory, per session) ───────── */
const cache = new Map();
export const clearCache = () => cache.clear();

/**
 * Calls onData(cached) immediately if we have it, then fetches fresh data and calls onData again.
 * Returns a promise that resolves/rejects with the fresh fetch result.
 */
export async function swr(key, fetcher, onData) {
  const hit = cache.get(key);
  if (hit) onData(hit, true);
  const fresh = await fetcher();
  cache.set(key, fresh);
  onData(fresh, false);
  return fresh;
}
