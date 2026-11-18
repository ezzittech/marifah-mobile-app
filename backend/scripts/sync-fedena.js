// Copies data from Fedena into our database. Run by the systemd timer; safe to run by hand.
//   npm run sync                       # everything, in dependency order
//   npm run sync -- --only=subjects,employees
//   npm run sync -- --status           # show the last runs
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { FedenaClient } from '../src/fedena/client.js';
import { runSync, ORDER } from '../src/fedena/sync.js';

const config = loadConfig();
const db = openDb(config.dbFile);

if (process.argv.includes('--status')) {
  const rows = db.prepare('SELECT id, entity, started_at, finished_at, status, item_count, message FROM sync_runs ORDER BY id DESC LIMIT 15').all();
  for (const r of rows) console.log(`${r.started_at}  ${r.entity.padEnd(10)} ${r.status.padEnd(7)} ${String(r.item_count ?? '').padStart(5)}  ${r.message || ''}`);
  const counts = {};
  for (const t of ['fedena_batches', 'fedena_students', 'fedena_subjects', 'fedena_employees', 'fedena_grading_levels']) {
    counts[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE active = 1`).get().n;
  }
  console.log('\nactive rows:', counts);
  process.exit(0);
}

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').map((s) => s.trim()).filter(Boolean) : null;
if (only) {
  const bad = only.filter((e) => !ORDER.includes(e));
  if (bad.length) { console.error(`Unknown entity: ${bad.join(', ')}. Valid: ${ORDER.join(', ')}`); process.exit(1); }
}

const client = new FedenaClient(config.fedena);
const results = await runSync({ db, client, only });
process.exit(results.every((r) => r.ok) ? 0 : 1);
