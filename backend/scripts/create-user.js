// Usage: npm run create-user -- --login MIS0529 --name "Student Name" [--role student]
//        [--partner-id 123] [--admission-no X] [--password '...'] [--reset]
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { hashPassword, randomPassword } from '../src/security.js';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) args[key] = true; else { args[key] = next; i++; }
}

const config = loadConfig();
const db = openDb(config.dbFile);
const login = args.login;
if (!login) { console.error('--login is required'); process.exit(1); }

const existing = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
const password = args.password || randomPassword();

if (existing) {
  if (!args.reset) { console.error(`User ${login} exists. Use --reset to issue a new temporary password.`); process.exit(1); }
  db.prepare('UPDATE users SET password_hash=?, must_change_password=1, token_version=token_version+1 WHERE id=?')
    .run(hashPassword(password), existing.id);
  console.log(`Reset ${login}. Temporary password: ${password}`);
} else {
  if (!args.name) { console.error('--name is required for new users'); process.exit(1); }
  db.prepare(`INSERT INTO users (login, role, name, password_hash, odoo_partner_id, fedena_admission_no)
              VALUES (?,?,?,?,?,?)`)
    .run(login, args.role || 'student', args.name, hashPassword(password),
      args['partner-id'] ? Number(args['partner-id']) : null, args['admission-no'] || login);
  console.log(`Created ${login}. Temporary password: ${password} (must be changed at first sign-in)`);
}
