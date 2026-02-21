import { getDb } from '../index';

export const name = '004_extension_tables';

export function up(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS lit_reviews (
      entity_id   TEXT PRIMARY KEY,
      scope_en    TEXT,
      scope_zh    TEXT,
      synthesis_en TEXT,
      synthesis_zh TEXT,
      takeaways_en TEXT,
      takeaways_zh TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meetings (
      entity_id     TEXT PRIMARY KEY,
      date_time     TEXT,
      agenda_en     TEXT,
      agenda_zh     TEXT,
      notes_en      TEXT,
      notes_zh      TEXT,
      action_items  TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skills (
      entity_id    TEXT PRIMARY KEY,
      category     TEXT,
      proficiency  TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS methods (
      entity_id       TEXT PRIMARY KEY,
      domain          TEXT,
      description_en  TEXT,
      description_zh  TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_systems (
      entity_id      TEXT PRIMARY KEY,
      composition    TEXT,
      structure_type TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS metrics (
      entity_id       TEXT PRIMARY KEY,
      definition_en   TEXT,
      definition_zh   TEXT,
      unit            TEXT,
      higher_is_better INTEGER DEFAULT 1,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collaborators (
      entity_id    TEXT PRIMARY KEY,
      name         TEXT,
      role         TEXT,
      affiliation  TEXT,
      website      TEXT,
      orcid        TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS institutions (
      entity_id   TEXT PRIMARY KEY,
      name        TEXT,
      location    TEXT,
      department  TEXT,
      website     TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media_items (
      entity_id             TEXT PRIMARY KEY,
      media_type            TEXT,
      source_path           TEXT,
      checksum              TEXT,
      size_bytes            INTEGER,
      preview_path          TEXT,
      provenance_entity_id  TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );
  `);
}
