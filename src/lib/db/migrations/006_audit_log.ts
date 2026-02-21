import { getDb } from '../index';

export const name = '006_audit_log';

export function up(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_id TEXT,
      entity_type TEXT,
      ip TEXT,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}
