import { parseXml, arr } from './xml.js';

export class FedenaError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Server-side only. Sequential, polite (small delay), retries transient failures. */
export class FedenaClient {
  constructor({ url, token, delayMs = 150 }, fetchImpl = fetch) {
    if (!url || !token) throw new Error('FEDENA_URL and FEDENA_TOKEN must be set');
    this.url = url.replace(/\/$/, '');
    this.token = token;
    this.delayMs = delayMs;
    this.fetch = fetchImpl;
    this._last = Promise.resolve();
  }

  /** Raw GET → XML text. Calls are serialised so we never hammer Fedena. */
  get(path, params = {}) {
    const run = this._last.then(() => this._get(path, params));
    this._last = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, this.delayMs)));
    return run;
  }

  async _get(path, params, attempt = 1) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) qs.append(k, String(v));
    const url = `${this.url}${path}${qs.size ? `?${qs}` : ''}`;
    try {
      const res = await this.fetch(url, {
        headers: { Authorization: `Token token="${this.token}"`, Accept: 'application/xml' },
        signal: AbortSignal.timeout(90000),
      });
      const body = await res.text();
      if (res.status >= 500 && attempt < 3) throw new FedenaError(res.status, 'transient');
      if (!res.ok) throw new FedenaError(res.status, `Fedena ${res.status} for ${path}`);
      return body;
    } catch (err) {
      const transient = !(err instanceof FedenaError) || err.status >= 500;
      if (transient && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        return this._get(path, params, attempt + 1);
      }
      throw err instanceof FedenaError ? err : new FedenaError(0, `Network error calling ${path}: ${err.message}`);
    }
  }

  async getParsed(path, params) {
    return parseXml(await this.get(path, params));
  }
}

/**
 * Reads a list endpoint. We do not know whether a Fedena list is paginated, so after the first page
 * we try ?page=2: if it is empty, errors, or repeats page 1, we conclude there is no pagination.
 */
export async function fetchAllItems(client, path, params, itemKey, { maxPages = 300 } = {}) {
  const sig = (o) => JSON.stringify(o);
  const first = arr((await client.getParsed(path, params))?.[itemKey]);
  if (!first.length) return [];
  const all = [...first];
  const seen = new Set([sig(first[0])]);
  for (let page = 2; page <= maxPages; page++) {
    let items;
    try { items = arr((await client.getParsed(path, { ...params, page }))?.[itemKey]); } catch { break; }
    if (!items.length || seen.has(sig(items[0]))) break;
    seen.add(sig(items[0]));
    all.push(...items);
  }
  return all;
}
