import { getDb } from '../index';
import * as m001 from './001_initial';
import * as m002 from './002_admin_auth';
import * as m003 from './003_curated_views';
import * as m004 from './004_extension_tables';
import * as m005 from './005_embeddings';
import * as m006 from './006_audit_log';

/** Each migration module must export a name and an up() function. */
interface Migration {
  name: string;
  up: () => void;
}

/**
 * Ordered list of all migrations.
 * Add new migration modules here as the schema evolves.
 */
const migrations: Migration[] = [
  m001,
  m002,
  m003,
  m004,
  m005,
  m006,
];

/**
 * Ensures the internal _migrations tracking table exists.
 */
function ensureMigrationsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

/**
 * Returns the set of migration names that have already been applied.
 */
function getAppliedMigrations(): Set<string> {
  const db = getDb();
  const rows = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

/**
 * Runs all pending migrations in order inside a transaction.
 * Skips migrations that have already been applied.
 * Returns the list of migration names that were applied in this run.
 */
export function runMigrations(): string[] {
  ensureMigrationsTable();

  const applied = getAppliedMigrations();
  const pending = migrations.filter((m) => !applied.has(m.name));

  if (pending.length === 0) {
    return [];
  }

  const db = getDb();
  const insertStmt = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

  const applyAll = db.transaction(() => {
    const ran: string[] = [];
    for (const migration of pending) {
      migration.up();
      insertStmt.run(migration.name);
      ran.push(migration.name);
    }
    return ran;
  });

  return applyAll();
}

/**
 * Returns the current migration status for diagnostics.
 */
export function getMigrationStatus(): { applied: string[]; pending: string[] } {
  ensureMigrationsTable();
  const appliedSet = getAppliedMigrations();
  return {
    applied: migrations.filter((m) => appliedSet.has(m.name)).map((m) => m.name),
    pending: migrations.filter((m) => !appliedSet.has(m.name)).map((m) => m.name),
  };
}
