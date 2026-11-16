// Session persistence. Wrapped in try/catch: storage can be unavailable (private mode).
const KEY = 'marifah.session';
let mem = null;

export function getSession() {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) mem = JSON.parse(raw);
  } catch { /* ignore */ }
  return mem;
}

export function saveSession(s) {
  mem = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function updateUser(patch) {
  const s = getSession();
  if (s) saveSession({ ...s, user: { ...s.user, ...patch } });
}

export function clearSession() {
  mem = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
