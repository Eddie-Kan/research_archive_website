import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _dbPath: string | null = null;
let _db: Database.Database | null = null;

function resolveDbPath(): string {
  return process.env.DATABASE_URL?.replace('file:', '') ||
    path.resolve(process.cwd(), 'data', 'archive.db');
}

/**
 * Returns the singleton better-sqlite3 database instance.
 * Creates the data directory and opens the database on first call.
 * Configures WAL journal mode, foreign keys, and a 5-second busy timeout.
 */
export function getDb(): Database.Database {
  if (!_db) {
    _dbPath = resolveDbPath();
    const dir = path.dirname(_dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(_dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.pragma('busy_timeout = 5000');
  }
  return _db;
}

/**
 * Closes the database connection and resets the singleton.
 * Safe to call even if the database was never opened.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    _dbPath = null;
  }
}

/**
 * Returns the resolved path to the database file.
 * Useful for diagnostics and backup tooling.
 */
export function getDbPath(): string {
  return _dbPath ?? resolveDbPath();
}
