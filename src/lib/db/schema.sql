-- ============================================================
-- EK Research Archive – SQLite Schema (FTS5)
-- ============================================================
-- Designed for local-first operation with better-sqlite3.
-- All TEXT PRIMARY KEYs expect externally-generated IDs (nanoid / UUID).
-- JSON columns are stored as TEXT and parsed in application code.
-- ============================================================

-- -----------------------------------------------------------
-- Core entity table (polymorphic base)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id                    TEXT PRIMARY KEY,
  type                  TEXT NOT NULL,          -- project | publication | experiment | dataset | model | repo | note | idea | lit_review | meeting | skill | method | material_system | metric | collaborator | institution | media
  title_en              TEXT,
  title_zh              TEXT,
  summary_en            TEXT,
  summary_zh            TEXT,
  body_en               TEXT,                   -- extracted MDX plain-text for search
  body_zh               TEXT,
  slug                  TEXT,
  status                TEXT NOT NULL DEFAULT 'active',   -- active | paused | completed | archived
  visibility            TEXT NOT NULL DEFAULT 'private',  -- private | unlisted | public
  cover_media_id        TEXT,
  checksum              TEXT,                   -- content-addressable hash for change detection
  source_of_truth_kind  TEXT,                   -- file | api | manual
  source_of_truth_pointer TEXT,                 -- e.g. relative file path or URL
  owner_role            TEXT,                   -- author | contributor | advisor
  raw_metadata          TEXT,                   -- full JSON blob from frontmatter / ingestion
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- -----------------------------------------------------------
-- Tags & tagging
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id              TEXT PRIMARY KEY,
  name_en         TEXT,
  name_zh         TEXT,
  category        TEXT,           -- topic | method | tool | domain | custom
  is_controlled   INTEGER NOT NULL DEFAULT 0,
  parent_id       TEXT,
  synonyms        TEXT,           -- JSON array of alternative names
  FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS entity_tags (
  entity_id TEXT NOT NULL,
  tag_id    TEXT NOT NULL,
  PRIMARY KEY (entity_id, tag_id),
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)    REFERENCES tags(id)     ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- Knowledge-graph edges
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS edges (
  id              TEXT PRIMARY KEY,
  from_id         TEXT NOT NULL,
  to_id           TEXT NOT NULL,
  edge_type       TEXT NOT NULL,   -- project_contains | produced | evaluated_on | cites | derived_from | implements | collaborates_with | related_to | supersedes
  label_en        TEXT,
  label_zh        TEXT,
  context_snippet TEXT,            -- optional excerpt explaining the relationship
  weight          REAL NOT NULL DEFAULT 1.0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (from_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id)   REFERENCES entities(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- Media / attachments
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
  id                    TEXT PRIMARY KEY,
  entity_id             TEXT,
  media_type            TEXT,       -- image | pdf | video | audio | archive | other
  source_path           TEXT,       -- relative path inside media storage
  checksum              TEXT,
  size_bytes            INTEGER,
  preview_path          TEXT,       -- thumbnail / preview relative path
  provenance_entity_id  TEXT,       -- entity that originally produced this media
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (entity_id)            REFERENCES entities(id) ON DELETE SET NULL,
  FOREIGN KEY (provenance_entity_id) REFERENCES entities(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------
-- Type-specific extension tables
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  entity_id             TEXT PRIMARY KEY,
  project_kind          TEXT,       -- thesis | research | side-project | course | collaboration
  research_area         TEXT,
  problem_statement_en  TEXT,
  problem_statement_zh  TEXT,
  contributions_en      TEXT,       -- JSON array of contribution strings
  contributions_zh      TEXT,
  start_date            TEXT,
  end_date              TEXT,
  advisor_id            TEXT,
  institution_id        TEXT,
  headline_en           TEXT,
  headline_zh           TEXT,
  impact_story_en       TEXT,
  impact_story_zh       TEXT,
  FOREIGN KEY (entity_id)      REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (advisor_id)     REFERENCES entities(id) ON DELETE SET NULL,
  FOREIGN KEY (institution_id) REFERENCES entities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS publications (
  entity_id           TEXT PRIMARY KEY,
  publication_type    TEXT,       -- journal | conference | preprint | thesis | book-chapter | technical-report
  venue_en            TEXT,
  venue_zh            TEXT,
  pub_date            TEXT,
  abstract_en         TEXT,
  abstract_zh         TEXT,
  doi                 TEXT,
  arxiv               TEXT,
  bibtex              TEXT,
  peer_review_status  TEXT,       -- submitted | under-review | accepted | published | rejected
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS experiments (
  entity_id         TEXT PRIMARY KEY,
  experiment_type   TEXT,       -- ablation | baseline | hyperparameter | evaluation | exploration
  hypothesis_en     TEXT,
  hypothesis_zh     TEXT,
  protocol_en       TEXT,
  protocol_zh       TEXT,
  reproducibility   TEXT,       -- JSON: { seed, env_hash, deterministic, notes }
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS datasets (
  entity_id         TEXT PRIMARY KEY,
  dataset_kind      TEXT,       -- benchmark | collected | synthetic | curated | external
  description_en    TEXT,
  description_zh    TEXT,
  schema_def        TEXT,       -- JSON schema or column definitions
  license           TEXT,
  provenance        TEXT,       -- JSON: { source, collection_method, date_range }
  storage_location  TEXT,
  storage_format    TEXT,       -- csv | parquet | json | sqlite | hdf5 | ...
  storage_size      INTEGER,
  storage_checksum  TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS models (
  entity_id         TEXT PRIMARY KEY,
  model_kind        TEXT,       -- trained | fine-tuned | pretrained | ensemble
  task              TEXT,
  architecture_en   TEXT,
  architecture_zh   TEXT,
  model_artifacts   TEXT,       -- JSON: { weights_path, config_path, tokenizer_path, ... }
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repos (
  entity_id       TEXT PRIMARY KEY,
  repo_kind       TEXT,       -- project | library | tool | config | data-pipeline
  remote_url      TEXT,
  local_path      TEXT,
  default_branch  TEXT,
  license         TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  entity_id       TEXT PRIMARY KEY,
  note_type       TEXT,       -- scratch | meeting | reading | reflection | reference
  body_mdx_id     TEXT,       -- optional reference to a media row holding the MDX file
  canonicality    TEXT,       -- canonical | draft | ephemeral
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ideas (
  entity_id             TEXT PRIMARY KEY,
  idea_kind             TEXT,       -- research-question | feature | improvement | hypothesis
  problem_en            TEXT,
  problem_zh            TEXT,
  proposed_approach_en  TEXT,
  proposed_approach_zh  TEXT,
  expected_value        TEXT,       -- JSON: { impact, feasibility, novelty }
  idea_status           TEXT NOT NULL DEFAULT 'new',  -- new | exploring | validated | parked | rejected
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- Experiment run records
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS run_records (
  id              TEXT PRIMARY KEY,
  experiment_id   TEXT NOT NULL,
  parameters      TEXT,       -- JSON of hyperparameters
  seed            TEXT,
  env_hash        TEXT,
  started_at      TEXT,
  completed_at    TEXT,
  status          TEXT,       -- running | completed | failed | cancelled
  metrics         TEXT,       -- JSON: { accuracy, loss, f1, ... }
  FOREIGN KEY (experiment_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- Curated views (saved filters / portfolios)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS curated_views (
  id                TEXT PRIMARY KEY,
  name_en           TEXT,
  name_zh           TEXT,
  description       TEXT,
  filter_config     TEXT,       -- JSON filter definition
  entity_allowlist  TEXT,       -- JSON array of entity IDs (manual override)
  access_token      TEXT,       -- optional share token
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- -----------------------------------------------------------
-- Integrity / lint issues
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS integrity_issues (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id   TEXT,
  issue_type  TEXT,       -- missing-field | broken-link | orphan | duplicate | schema-violation
  message     TEXT,
  detected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- Full-text search (FTS5)
-- -----------------------------------------------------------
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  id UNINDEXED,
  title_en,
  title_zh,
  summary_en,
  summary_zh,
  body_en,
  body_zh,
  tags_text
);

-- -----------------------------------------------------------
-- Indexes for common query patterns
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_entities_type        ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_status      ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_visibility  ON entities(visibility);
CREATE INDEX IF NOT EXISTS idx_entities_slug        ON entities(slug);
CREATE INDEX IF NOT EXISTS idx_entities_created_at  ON entities(created_at);
CREATE INDEX IF NOT EXISTS idx_entities_updated_at  ON entities(updated_at);
CREATE INDEX IF NOT EXISTS idx_entities_type_status ON entities(type, status);
CREATE INDEX IF NOT EXISTS idx_entities_type_vis    ON entities(type, visibility);

CREATE INDEX IF NOT EXISTS idx_entity_tags_tag      ON entity_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_edges_from           ON edges(from_id);
CREATE INDEX IF NOT EXISTS idx_edges_to             ON edges(to_id);
CREATE INDEX IF NOT EXISTS idx_edges_type           ON edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_edges_from_type      ON edges(from_id, edge_type);
CREATE INDEX IF NOT EXISTS idx_edges_to_type        ON edges(to_id, edge_type);

CREATE INDEX IF NOT EXISTS idx_media_entity         ON media(entity_id);
CREATE INDEX IF NOT EXISTS idx_media_type           ON media(media_type);

CREATE INDEX IF NOT EXISTS idx_run_records_exp      ON run_records(experiment_id);
CREATE INDEX IF NOT EXISTS idx_run_records_status   ON run_records(status);

CREATE INDEX IF NOT EXISTS idx_integrity_entity     ON integrity_issues(entity_id);
CREATE INDEX IF NOT EXISTS idx_integrity_type       ON integrity_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_integrity_unresolved ON integrity_issues(resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tags_category        ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_parent          ON tags(parent_id);
