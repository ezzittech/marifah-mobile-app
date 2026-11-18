// Calls one Fedena API endpoint and saves the RAW XML so we can design the parser from real responses.
// Usage:
//   npm run fedena-probe -- /api/subjects "search[batch_name_equals]=A1 26/27" "search[batch_course_code_equals]=G10"
// Output is saved to backend/data/fedena-samples/ (git-ignored). Use --mask to hide emails/phones in the printout.
import fs from 'node:fs';

const url = (process.env.FEDENA_URL || '').replace(/\/$/, '');
const token = process.env.FEDENA_TOKEN || '';
if (!url || !token) { console.error('Set FEDENA_URL and FEDENA_TOKEN in .env'); process.exit(1); }

const args = process.argv.slice(2);
const mask = args.includes('--mask');
const limitArg = args.find((a) => a.startsWith('--chars='));
const chars = limitArg ? Number(limitArg.split('=')[1]) : 3500;
const rest = args.filter((a) => !a.startsWith('--'));
const path = rest[0];
if (!path || !path.startsWith('/')) {
  console.error('Usage: npm run fedena-probe -- /api/<endpoint> "search[field_equals]=value" ... [--mask] [--chars=N]');
  process.exit(1);
}

const qs = new URLSearchParams();
for (const kv of rest.slice(1)) {
  const i = kv.indexOf('=');
  if (i > 0) qs.append(kv.slice(0, i), kv.slice(i + 1));
}
const full = `${url}${path}${qs.toString() ? `?${qs}` : ''}`;
console.log('GET', full.replace(token, '***'));

const t0 = Date.now();
const res = await fetch(full, {
  headers: { Authorization: `Token token="${token}"`, Accept: 'application/xml' },
  signal: AbortSignal.timeout(120000),
});
const body = await res.text();
console.log(`status ${res.status} | ${body.length} bytes | ${Date.now() - t0} ms | content-type ${res.headers.get('content-type')}`);

const dir = new URL('../data/fedena-samples/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const name = (path.replace(/[^a-z0-9]+/gi, '_') + '_' + Date.now()).replace(/^_/, '') + '.xml';
fs.writeFileSync(new URL(name, dir), body);
console.log('saved ->', `backend/data/fedena-samples/${name}`);

let shown = body.slice(0, chars);
if (mask) {
  shown = shown
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '***@***')
    .replace(/(<(?:phone|mobile_phone|office_phone|home_phone)[^>]*>)[^<]+/g, '$1***');
}
console.log('\n' + shown + (body.length > chars ? `\n… (+${body.length - chars} more chars)` : ''));
