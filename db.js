const Database = require('better-sqlite3');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, 'inoutboard.db');

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
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);
  // Migrate: add vehicle_id column to employees if it doesn't exist
  try {
    db.exec('ALTER TABLE employees ADD COLUMN vehicle_id INTEGER REFERENCES vehicles(id)');
  } catch (e) {
    // Column already exists, ignore
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);
  // Seed departments from any existing employee department values
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)');
  db.prepare("SELECT DISTINCT department FROM employees WHERE department != ''")
    .all()
    .forEach(({ department }) => insertDept.run(department));
  db.close();
}

module.exports = { getDb, initDb, DB_PATH };
