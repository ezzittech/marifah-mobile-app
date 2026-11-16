/**
 * Minimal Odoo JSON-RPC client (session based), port of the old api.php logic.
 * - re-uses one session across requests
 * - re-authenticates once automatically if the session expired
 */
export class OdooClient {
  constructor({ url, db, user, password }, fetchImpl = fetch) {
    this.url = url;
    this.db = db;
    this.user = user;
    this.password = password;
    this.fetch = fetchImpl;
    this.sid = null;
    this._authPromise = null;
  }

  async _post(path, payload) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.sid) headers.Cookie = `session_id=${this.sid}`;
    const res = await this.fetch(this.url + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of cookies) {
      const m = /session_id=([^;]+)/i.exec(c);
      if (m) this.sid = m[1];
    }
    return res.json().catch(() => ({}));
  }

  authenticate() {
    if (!this._authPromise) {
      this._authPromise = (async () => {
        this.sid = null;
        const j = await this._post('/web/session/authenticate', {
          jsonrpc: '2.0', method: 'call', id: 1,
          params: { db: this.db, login: this.user, password: this.password },
        });
        if (j.error || !j.result?.uid) throw new Error('Odoo authentication failed');
        return true;
      })().finally(() => { this._authPromise = null; });
    }
    return this._authPromise;
  }

  async call(model, method, args = [], kwargs = {}, retry = true) {
    if (!this.sid) await this.authenticate();
    const j = await this._post('/web/dataset/call_kw', {
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { model, method, args, kwargs: { ...kwargs, context: kwargs.context || {} } },
    });
    if (j.error) {
      const name = j.error.data?.name || '';
      if (retry && (/session/i.test(name) || j.error.code === 100)) {
        this.sid = null;
        return this.call(model, method, args, kwargs, false);
      }
      throw new Error(j.error.data?.message || 'Odoo error');
    }
    return j.result ?? [];
  }

  searchRead(model, domain, fields, extra = {}) {
    return this.call(model, 'search_read', [domain], { fields, ...extra });
  }
}
