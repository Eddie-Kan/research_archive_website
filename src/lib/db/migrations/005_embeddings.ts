import { getDb } from '../index';

export const name = '005_embeddings';

export function up(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      entity_id  TEXT PRIMARY KEY,
      vector     BLOB NOT NULL,
      model      TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );
  `);
}
