import { Router, createHttpServer } from './http.js';
import { verifyJwt } from './security.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerFinanceRoutes } from './routes/finance.js';
import { registerAcademicRoutes } from './routes/academic.js';

/** Builds the HTTP server. db/odoo are injected so tests can use fakes. */
export function createApp({ config, db, odoo, log }) {
  const router = new Router();

  router.get('/api/health', () => ({ ok: true, time: new Date().toISOString() }), { auth: false });
  registerAuthRoutes({ router, db, config });
  registerFinanceRoutes({ router, db, config, odoo });
  registerAcademicRoutes({ router });

  const authenticate = (req) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    const claims = verifyJwt(token, config.jwtSecret);
    if (!claims) return null;
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(claims.sub);
    if (!user || user.token_version !== claims.tv) return null;
    return user;
  };

  return createHttpServer({ router, config, authenticate, log });
}
