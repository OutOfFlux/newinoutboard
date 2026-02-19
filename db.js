const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'inoutboard.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN',
      comment TEXT NOT NULL DEFAULT '',
      estimated_return TEXT NOT NULL DEFAULT '',
      last_changed TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.close();
}

module.exports = { getDb, initDb, DB_PATH };
