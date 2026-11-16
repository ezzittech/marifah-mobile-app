import http from 'node:http';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

/** Tiny router + JSON helpers so the server has zero npm dependencies. */
export class Router {
  constructor() {
    this.routes = [];
  }
  add(method, pattern, handler, opts = {}) {
    const keys = [];
    const re = new RegExp(
      '^' + pattern.replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$'
    );
    this.routes.push({ method, re, keys, handler, opts });
  }
  get(p, h, o) { this.add('GET', p, h, o); }
  post(p, h, o) { this.add('POST', p, h, o); }
  match(method, pathname) {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(pathname);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { route: r, params };
      }
    }
    return null;
  }
}

const MAX_BODY = 64 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'payload_too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'invalid_json', 'Request body must be JSON')); }
    });
    req.on('error', reject);
  });
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}

export function createHttpServer({ router, config, authenticate, log = console }) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const allowed = origin && config.allowedOrigins.includes(origin);

    const send = (status, body, extra = {}) => {
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        Vary: 'Origin',
        ...extra,
      };
      if (allowed) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        headers['Access-Control-Max-Age'] = '600';
      }
      res.writeHead(status, headers);
      res.end(body === undefined ? '' : JSON.stringify(body));
    };

    try {
      if (req.method === 'OPTIONS') return send(allowed ? 204 : 403);

      const url = new URL(req.url, 'http://localhost');
      const found = router.match(req.method, url.pathname);
      if (!found) throw new HttpError(404, 'not_found', 'Not found');

      const ctx = {
        req,
        ip: clientIp(req, config.trustProxy),
        params: found.params,
        query: Object.fromEntries(url.searchParams),
        body: req.method === 'POST' ? await readBody(req) : {},
        user: null,
      };
      if (found.route.opts.auth !== false) {
        ctx.user = authenticate(req);
        if (!ctx.user) throw new HttpError(401, 'unauthorized', 'Please sign in');
        if (ctx.user.must_change_password && !found.route.opts.allowTempPassword) {
          throw new HttpError(403, 'password_change_required', 'Please change your temporary password');
        }
        if (found.route.opts.roles && !found.route.opts.roles.includes(ctx.user.role)) {
          throw new HttpError(403, 'forbidden', 'Not allowed');
        }
      }
      const result = await found.route.handler(ctx);
      send(200, result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) {
        send(err.status, { success: false, code: err.code, message: err.message });
      } else {
        log.error('[error]', err);
        send(500, { success: false, code: 'server_error', message: 'Something went wrong' });
      }
    }
  });
}
