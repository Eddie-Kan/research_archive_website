import { getDb } from '../index';

export const name = '003_curated_views';

export function up(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS curated_views (
      id                TEXT PRIMARY KEY,
      name_en           TEXT,
      name_zh           TEXT,
      description       TEXT,
      filter_config     TEXT,
      entity_allowlist  TEXT,
      access_token      TEXT,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}
