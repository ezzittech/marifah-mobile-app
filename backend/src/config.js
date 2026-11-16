export function loadConfig(env = process.env) {
  const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
  const cfg = {
    env: env.NODE_ENV || 'development',
    port: num(env.PORT, 6975),
    host: env.HOST || '127.0.0.1',
    jwtSecret: env.JWT_SECRET || '',
    jwtTtlSeconds: num(env.JWT_TTL_DAYS, 14) * 86400,
    allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    trustProxy: env.TRUST_PROXY === '1',
    dbFile: env.DB_FILE || './data/marifah.db',
    odoo: {
      url: (env.ODOO_URL || 'http://127.0.0.1:8069').replace(/\/$/, ''),
      db: env.ODOO_DB || '',
      user: env.ODOO_USER || '',
      password: env.ODOO_PASS || '',
      publicUrl: (env.ODOO_PUBLIC_URL || '').replace(/\/$/, ''),
    },
    fedena: { url: (env.FEDENA_URL || '').replace(/\/$/, ''), token: env.FEDENA_TOKEN || '' },
  };
  if (cfg.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters (see .env.example)');
  }
  return cfg;
}
