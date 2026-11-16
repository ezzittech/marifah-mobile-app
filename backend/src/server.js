import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { OdooClient } from './odoo.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = openDb(config.dbFile);
const odoo = new OdooClient(config.odoo);

createApp({ config, db, odoo, log: console }).listen(config.port, config.host, () => {
  console.log(`Marifah API listening on http://${config.host}:${config.port}`);
});
