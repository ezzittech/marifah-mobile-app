import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { hashPassword, signJwt, verifyJwt, verifyPassword } from '../src/security.js';
import { mapInvoice } from '../src/services/finance.js';

const config = {
  env: 'test', port: 0, host: '127.0.0.1', jwtSecret: 'x'.repeat(48), jwtTtlSeconds: 3600,
  allowedOrigins: ['https://app.example'], trustProxy: false, odoo: { url: 'http://odoo', publicUrl: 'http://odoo' },
};

// fake Odoo: records the partner ids it was asked about
function fakeOdoo() {
  const asked = [];
  return {
    asked,
    async searchRead(model, domain) {
      const pid = domain.find((d) => d[0] === 'partner_id')?.[2];
      asked.push(pid);
      return [{ name: `INV/${pid}/1`, amount_total: 100, amount_residual: 40, payment_state: 'partial', invoice_date: '2026-01-01', invoice_date_due: '2026-02-01' }];
    },
    async call() { return []; },
  };
}

async function setup() {
  const db = openDb(':memory:');
  const add = db.prepare('INSERT INTO users (login, role, name, password_hash, must_change_password, odoo_partner_id) VALUES (?,?,?,?,?,?)');
  add.run('S1', 'student', 'Alice', hashPassword('password-one'), 0, 11);
  add.run('S2', 'student', 'Bob', hashPassword('password-two'), 0, 22);
  add.run('S3', 'student', 'Temp', hashPassword('temp-pass-1'), 1, 33);
  const odoo = fakeOdoo();
  const server = createApp({ config, db, odoo, log: { error() {} } });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const req = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, headers: res.headers, json: await res.json().catch(() => null) };
  };
  return { db, odoo, server, req };
}

test('password hashing & JWT', () => {
  const h = hashPassword('secret123');
  assert.ok(verifyPassword('secret123', h));
  assert.ok(!verifyPassword('wrong', h));
  const t = signJwt({ sub: 1 }, 'k'.repeat(40), 60);
  assert.equal(verifyJwt(t, 'k'.repeat(40)).sub, 1);
  assert.equal(verifyJwt(t, 'z'.repeat(40)), null);
  assert.equal(verifyJwt(t.slice(0, -2) + 'xx', 'k'.repeat(40)), null);
  assert.equal(verifyJwt(signJwt({ sub: 1 }, 'k'.repeat(40), -10), 'k'.repeat(40)), null);
});

test('invoice mapping', () => {
  assert.equal(mapInvoice({ name: 'A', amount_total: 100, amount_residual: 0, payment_state: 'paid' }).status, 'paid');
  assert.equal(mapInvoice({ name: 'A', amount_total: 100, amount_residual: 30, payment_state: 'partial' }).status, 'partial');
  const o = mapInvoice({ name: 'A', amount_total: 100, amount_residual: 100, payment_state: 'not_paid', invoice_date_due: '2000-01-01' });
  assert.equal(o.status, 'unpaid');
  assert.equal(o.overdue, true);
});

test('login, finance isolation, password change flow', async () => {
  const { req, odoo, server } = await setup();
  try {
    assert.equal((await req('/api/finance')).status, 401);
    assert.equal((await req('/api/auth/login', { method: 'POST', body: { login: 'S1', password: 'bad' } })).status, 401);
    assert.equal((await req('/api/auth/login', { method: 'POST', body: { login: 'nobody', password: 'bad' } })).status, 401);

    const a = await req('/api/auth/login', { method: 'POST', body: { login: 's1', password: 'password-one' } });
    assert.equal(a.status, 200);
    assert.equal(a.json.user.name, 'Alice');
    assert.equal(a.json.user.password_hash, undefined);

    const fin = await req('/api/finance', { token: a.json.token });
    assert.equal(fin.status, 200);
    assert.equal(fin.json.total_due, 40);
    // the client cannot choose the partner: only Alice's partner (11) was queried
    assert.deepEqual(odoo.asked, [11]);

    // temp-password accounts are blocked until they change it
    const t = await req('/api/auth/login', { method: 'POST', body: { login: 'S3', password: 'temp-pass-1' } });
    assert.equal((await req('/api/finance', { token: t.json.token })).json.code, 'password_change_required');
    assert.equal((await req('/api/me', { token: t.json.token })).status, 200);
    assert.equal((await req('/api/auth/change-password', { method: 'POST', token: t.json.token, body: { current_password: 'temp-pass-1', new_password: 'short' } })).status, 400);
    const ch = await req('/api/auth/change-password', { method: 'POST', token: t.json.token, body: { current_password: 'temp-pass-1', new_password: 'a-better-pass-9' } });
    assert.equal(ch.status, 200);
    assert.equal((await req('/api/me', { token: t.json.token })).status, 401); // old token revoked
    assert.equal((await req('/api/finance', { token: ch.json.token })).status, 200);
  } finally { server.close(); }
});

test('login rate limiting and CORS', async () => {
  const { req, server } = await setup();
  try {
    for (let i = 0; i < 8; i++) await req('/api/auth/login', { method: 'POST', body: { login: 'S2', password: 'nope' } });
    const blocked = await req('/api/auth/login', { method: 'POST', body: { login: 'S2', password: 'password-two' } });
    assert.equal(blocked.status, 429);

    const ok = await req('/api/health', { headers: { Origin: 'https://app.example' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://app.example');
    const bad = await req('/api/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(bad.headers.get('access-control-allow-origin'), null);
  } finally { server.close(); }
});
