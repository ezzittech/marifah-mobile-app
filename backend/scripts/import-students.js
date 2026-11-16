// Creates an app account for every Odoo partner that has x_student_number.
// Existing accounts are left untouched. Temporary passwords go to data/initial-passwords.csv
// (git-ignored). Hand them out, then DELETE the file.
// Usage: npm run import-students [-- --dry-run]
import fs from 'node:fs';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { OdooClient } from '../src/odoo.js';
import { hashPassword, randomPassword } from '../src/security.js';

const dry = process.argv.includes('--dry-run');
const config = loadConfig();
const db = openDb(config.dbFile);
const odoo = new OdooClient(config.odoo);

const partners = await odoo.searchRead(
  'res.partner', [['x_student_number', '!=', false]],
  ['id', 'name', 'x_student_number', 'email'], { order: 'x_student_number' }
);
console.log(`Odoo partners with a student number: ${partners.length}`);

const rows = [];
let skipped = 0;
for (const p of partners) {
  const login = String(p.x_student_number).trim();
  if (!login) continue;
  if (db.prepare('SELECT 1 FROM users WHERE login = ?').get(login)) { skipped++; continue; }
  const password = randomPassword();
  if (!dry) {
    db.prepare(`INSERT INTO users (login, role, name, password_hash, odoo_partner_id, fedena_admission_no, email)
                VALUES (?,?,?,?,?,?,?)`)
      .run(login, 'student', p.name, hashPassword(password), p.id, login, p.email || null);
  }
  rows.push([login, p.name, password]);
}

console.log(`${dry ? 'Would create' : 'Created'}: ${rows.length}, already existed: ${skipped}`);
if (!dry && rows.length) {
  const csv = ['student_id,name,temporary_password', ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  fs.writeFileSync(new URL('../data/initial-passwords.csv', import.meta.url), csv, { mode: 0o600 });
  console.log('Temporary passwords written to backend/data/initial-passwords.csv (delete it after distributing).');
}
