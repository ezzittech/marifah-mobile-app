import { HttpError } from '../http.js';
import { audit } from '../db.js';
import { hashPassword, verifyPassword, signJwt, DUMMY_HASH, RateLimiter } from '../security.js';

export function publicUser(u) {
  return {
    id: u.id,
    login: u.login,
    role: u.role,
    name: u.name,
    lang: u.lang,
    email: u.email || null,
    must_change_password: !!u.must_change_password,
    has_finance: !!u.odoo_partner_id,
  };
}

export function registerAuthRoutes({ router, db, config, limiter }) {
  limiter = limiter || new RateLimiter({ max: 8, windowMs: 15 * 60 * 1000 });
  const ipLimiter = new RateLimiter({ max: 40, windowMs: 15 * 60 * 1000 });

  router.post('/api/auth/login', ({ body, ip }) => {
    const login = String(body.login ?? '').trim();
    const password = String(body.password ?? '');
    if (!login || !password || login.length > 64 || password.length > 200) {
      throw new HttpError(400, 'invalid_input', 'Student ID and password are required');
    }
    const key = `${ip}|${login.toLowerCase()}`;
    if (limiter.blocked(key) || ipLimiter.blocked(ip)) {
      throw new HttpError(429, 'too_many_attempts', 'Too many attempts. Try again in a few minutes.');
    }

    const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
    // always run scrypt so response time does not reveal whether the account exists
    const ok = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok || !user.active) {
      limiter.fail(key);
      ipLimiter.fail(ip);
      audit(db, user?.id, 'login_failed', ip, login);
      throw new HttpError(401, 'invalid_credentials', 'Incorrect Student ID or password');
    }

    limiter.reset(key);
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
    audit(db, user.id, 'login', ip);
    const token = signJwt({ sub: user.id, role: user.role, tv: user.token_version }, config.jwtSecret, config.jwtTtlSeconds);
    return { success: true, token, user: publicUser(user) };
  }, { auth: false });

  router.get('/api/me', ({ user }) => ({ success: true, user: publicUser(user) }), { allowTempPassword: true });

  router.post('/api/auth/change-password', ({ user, body, ip }) => {
    const current = String(body.current_password ?? '');
    const next = String(body.new_password ?? '');
    if (!verifyPassword(current, user.password_hash)) {
      throw new HttpError(401, 'invalid_credentials', 'Current password is incorrect');
    }
    if (next.length < 8 || next.length > 200) {
      throw new HttpError(400, 'weak_password', 'New password must be at least 8 characters');
    }
    if (next === current || next.toLowerCase() === user.login.toLowerCase()) {
      throw new HttpError(400, 'weak_password', 'Choose a different password');
    }
    const newVersion = user.token_version + 1;
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, token_version = ? WHERE id = ?')
      .run(hashPassword(next), newVersion, user.id);
    audit(db, user.id, 'password_changed', ip);
    // old tokens are now revoked; hand back a fresh one
    const token = signJwt({ sub: user.id, role: user.role, tv: newVersion }, config.jwtSecret, config.jwtTtlSeconds);
    return { success: true, token };
  }, { allowTempPassword: true });

  router.post('/api/me/lang', ({ user, body }) => {
    const lang = body.lang === 'ar' ? 'ar' : 'en';
    db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(lang, user.id);
    return { success: true, lang };
  });
}
