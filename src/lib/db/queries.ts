import type Database from 'better-sqlite3';
import { getDb } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Entity {
  id: string;
  type: string;
  title_en: string | null;
  title_zh: string | null;
  summary_en: string | null;
  summary_zh: string | null;
  body_en: string | null;
  body_zh: string | null;
  slug: string | null;
  status: string;
  visibility: string;
  cover_media_id: string | null;
  checksum: string | null;
  source_of_truth_kind: string | null;
  source_of_truth_pointer: string | null;
  owner_role: string | null;
  raw_metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface Edge {
  id: string;
  from_id: string;
  to_id: string;
  edge_type: string;
  label_en: string | null;
  label_zh: string | null;
  context_snippet: string | null;
  weight: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name_en: string | null;
  name_zh: string | null;
  category: string | null;
  is_controlled: number;
  parent_id: string | null;
  synonyms: string | null;
}

export interface EntityWithRelations extends Entity {
  edges_from: Edge[];
  edges_to: Edge[];
  tags: Tag[];
  type_data: Record<string, unknown> | null;
}

export interface ListFilters {
  status?: string;
  visibility?: string | string[];
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;       // column name
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface CuratedView {
  id: string;
  name_en: string | null;
  name_zh: string | null;
  description: string | null;
  filter_config: string | null;
  entity_allowlist: string | null;
  access_token: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Type-specific table mapping
// ---------------------------------------------------------------------------

const TYPE_TABLES: Record<string, { table: string; columns: Set<string> }> = {
  project: { table: 'projects', columns: new Set(['project_kind','research_area','problem_statement_en','problem_statement_zh','contributions_en','contributions_zh','start_date','end_date','advisor_id','institution_id','headline_en','headline_zh','impact_story_en','impact_story_zh']) },
  publication: { table: 'publications', columns: new Set(['publication_type','venue_en','venue_zh','pub_date','abstract_en','abstract_zh','doi','arxiv','bibtex','peer_review_status']) },
  experiment: { table: 'experiments', columns: new Set(['experiment_type','hypothesis_en','hypothesis_zh','protocol_en','protocol_zh','reproducibility']) },
  dataset: { table: 'datasets', columns: new Set(['dataset_kind','description_en','description_zh','schema_def','license','provenance','storage_location','storage_format','storage_size','storage_checksum']) },
  model: { table: 'models', columns: new Set(['model_kind','task','architecture_en','architecture_zh','model_artifacts']) },
  repo: { table: 'repos', columns: new Set(['repo_kind','remote_url','local_path','default_branch','license']) },
  note: { table: 'notes', columns: new Set(['note_type','body_mdx_id','canonicality']) },
  idea: { table: 'ideas', columns: new Set(['idea_kind','problem_en','problem_zh','proposed_approach_en','proposed_approach_zh','expected_value','idea_status']) },
  lit_review: { table: 'lit_reviews', columns: new Set(['scope_en','scope_zh','synthesis_en','synthesis_zh','takeaways_en','takeaways_zh']) },
  meeting: { table: 'meetings', columns: new Set(['date_time','agenda_en','agenda_zh','notes_en','notes_zh','action_items']) },
  skill: { table: 'skills', columns: new Set(['category','proficiency']) },
  method: { table: 'methods', columns: new Set(['domain','description_en','description_zh']) },
  material_system: { table: 'material_systems', columns: new Set(['composition','structure_type']) },
  metric: { table: 'metrics', columns: new Set(['definition_en','definition_zh','unit','higher_is_better']) },
  collaborator: { table: 'collaborators', columns: new Set(['name','role','affiliation','website','orcid']) },
  institution: { table: 'institutions', columns: new Set(['name','location','department','website']) },
  media: { table: 'media_items', columns: new Set(['media_type','source_path','checksum','size_bytes','preview_path','provenance_entity_id']) },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildVisibilityClause(
  visibility: string | string[] | undefined,
  params: Record<string, unknown>,
  prefix = ''
): string {
  if (!visibility) return '';
  const col = prefix ? `${prefix}.visibility` : 'visibility';
  if (Array.isArray(visibility)) {
    const placeholders = visibility.map((_, i) => `@vis${i}`);
    visibility.forEach((v, i) => { params[`vis${i}`] = v; });
    return ` AND ${col} IN (${placeholders.join(', ')})`;
  }
  params.visibility = visibility;
  return ` AND ${col} = @visibility`;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Fetch a single entity by ID, optionally filtered by visibility.
 */
export function getEntityById(
  id: string,
  visibility?: string | string[]
): Entity | null {
  const db = getDb();
  const params: Record<string, unknown> = { id };
  let sql = 'SELECT * FROM entities WHERE id = @id';
  sql += buildVisibilityClause(visibility, params);

  const stmt = db.prepare(sql);
  return (stmt.get(params) as Entity) ?? null;
}

/**
 * List entities with filtering, pagination, and sorting.
 */
export function listEntities(
  type: string | undefined,
  filters: ListFilters = {}
): PaginatedResult<Entity> {
  const db = getDb();
  const params: Record<string, unknown> = {};
  const conditions: string[] = [];

  if (type) {
    params.type = type;
    conditions.push('e.type = @type');
  }

  if (filters.status) {
    params.status = filters.status;
    conditions.push('e.status = @status');
  }

  if (filters.visibility) {
    if (Array.isArray(filters.visibility)) {
      const placeholders = filters.visibility.map((_, i) => `@vis${i}`);
      filters.visibility.forEach((v, i) => { params[`vis${i}`] = v; });
      conditions.push(`e.visibility IN (${placeholders.join(', ')})`);
    } else {
      params.visibility = filters.visibility;
      conditions.push('e.visibility = @visibility');
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map((_, i) => `@tag${i}`);
    filters.tags.forEach((t, i) => { params[`tag${i}`] = t; });
    conditions.push(`e.id IN (
      SELECT entity_id FROM entity_tags
      WHERE tag_id IN (${tagPlaceholders.join(', ')})
      GROUP BY entity_id
      HAVING COUNT(DISTINCT tag_id) = ${filters.tags.length}
    )`);
  }

  // FTS search
  let fromClause = 'entities e';
  if (filters.search) {
    params.search = filters.search;
    fromClause = `entities e INNER JOIN (
      SELECT id, rank FROM search_index WHERE search_index MATCH @search
    ) s ON e.id = s.id`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count
  const countSql = `SELECT COUNT(*) as total FROM ${fromClause} ${whereClause}`;
  const { total } = db.prepare(countSql).get(params) as { total: number };

  // Sort
  const allowedSortCols = new Set([
    'created_at', 'updated_at', 'title_en', 'title_zh', 'type', 'status',
  ]);
  let orderClause: string;
  if (filters.search) {
    orderClause = 'ORDER BY s.rank';
  } else {
    const sortCol = filters.sort && allowedSortCols.has(filters.sort) ? `e.${filters.sort}` : 'e.updated_at';
    const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';
    orderClause = `ORDER BY ${sortCol} ${sortDir}`;
  }

  // Pagination
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
  const offset = (page - 1) * limit;
  params._limit = limit;
  params._offset = offset;

  const dataSql = `SELECT e.* FROM ${fromClause} ${whereClause} ${orderClause} LIMIT @_limit OFFSET @_offset`;
  const data = db.prepare(dataSql).all(params) as Entity[];

  return {
    items: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get all outgoing edges from an entity.
 */
export function getEdgesFrom(entityId: string): Edge[] {
  const db = getDb();
  return db.prepare('SELECT * FROM edges WHERE from_id = ? ORDER BY edge_type, weight DESC').all(entityId) as Edge[];
}

/**
 * Get all incoming edges (backlinks) to an entity.
 */
export function getEdgesTo(entityId: string): Edge[] {
  const db = getDb();
  return db.prepare('SELECT * FROM edges WHERE to_id = ? ORDER BY edge_type, weight DESC').all(entityId) as Edge[];
}

/**
 * Get tags associated with an entity.
 */
export function getTagsForEntity(entityId: string): Tag[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN entity_tags et ON et.tag_id = t.id
    WHERE et.entity_id = ?
    ORDER BY t.category, t.name_en
  `).all(entityId) as Tag[];
}

/**
 * Get type-specific data for an entity.
 */
function getTypeData(db: Database.Database, entity: Entity): Record<string, unknown> | null {
  const entry = TYPE_TABLES[entity.type];
  if (!entry) return null;
  const row = db.prepare(`SELECT * FROM ${entry.table} WHERE entity_id = ?`).get(entity.id);
  return (row as Record<string, unknown>) ?? null;
}

/**
 * Fetch an entity with all its relations: edges, backlinks, tags, and type-specific data.
 */
export function getEntityWithRelations(
  id: string,
  visibility?: string | string[]
): EntityWithRelations | null {
  const entity = getEntityById(id, visibility);
  if (!entity) return null;

  const db = getDb();
  return {
    ...entity,
    edges_from: getEdgesFrom(id),
    edges_to: getEdgesTo(id),
    tags: getTagsForEntity(id),
    type_data: getTypeData(db, entity),
  };
}

/**
 * Insert or update an entity in the base entities table and its type-specific table.
 * Accepts a partial entity object; id is required.
 */
export function upsertEntity(
  entity: Partial<Entity> & { id: string; type: string },
  typeData?: Record<string, unknown>
): void {
  const db = getDb();

  const upsertTx = db.transaction(() => {
    // Build column lists dynamically from the provided fields
    const entityCols = [
      'id', 'type', 'title_en', 'title_zh', 'summary_en', 'summary_zh',
      'body_en', 'body_zh', 'slug', 'status', 'visibility', 'cover_media_id',
      'checksum', 'source_of_truth_kind', 'source_of_truth_pointer',
      'owner_role', 'raw_metadata',
    ] as const;

    const presentCols = entityCols.filter((c) => entity[c as keyof Entity] !== undefined);
    const colList = presentCols.join(', ');
    const paramList = presentCols.map((c) => `@${c}`).join(', ');

    // On conflict, update all columns except id
    const updateList = presentCols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');

    const sql = `
      INSERT INTO entities (${colList}, updated_at)
      VALUES (${paramList}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(id) DO UPDATE SET
        ${updateList},
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `;

    const params: Record<string, unknown> = {};
    for (const col of presentCols) {
      params[col] = entity[col as keyof Entity] ?? null;
    }

    db.prepare(sql).run(params);

    // Type-specific table
    if (typeData) {
      const entry = TYPE_TABLES[entity.type];
      if (entry) {
        // Only allow whitelisted column names to prevent SQL injection
        const tdCols = Object.keys(typeData).filter((c) => entry.columns.has(c));
        if (tdCols.length > 0) {
          const allCols = ['entity_id', ...tdCols];
          const allParams = allCols.map((c) => `@${c}`).join(', ');
          const tdUpdate = tdCols.map((c) => `${c} = excluded.${c}`).join(', ');

          const tdSql = `
            INSERT INTO ${entry.table} (${allCols.join(', ')})
            VALUES (${allParams})
            ON CONFLICT(entity_id) DO UPDATE SET ${tdUpdate}
          `;

          const tdParams: Record<string, unknown> = { entity_id: entity.id };
          for (const col of tdCols) {
            tdParams[col] = typeData[col] ?? null;
          }

          db.prepare(tdSql).run(tdParams);
        }
      }
    }
  });

  upsertTx();
}

/**
 * Insert or update an edge.
 */
export function upsertEdge(edge: Partial<Edge> & { id: string; from_id: string; to_id: string; edge_type: string }): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO edges (id, from_id, to_id, edge_type, label_en, label_zh, context_snippet, weight)
    VALUES (@id, @from_id, @to_id, @edge_type, @label_en, @label_zh, @context_snippet, @weight)
    ON CONFLICT(id) DO UPDATE SET
      from_id = excluded.from_id,
      to_id = excluded.to_id,
      edge_type = excluded.edge_type,
      label_en = excluded.label_en,
      label_zh = excluded.label_zh,
      context_snippet = excluded.context_snippet,
      weight = excluded.weight
  `).run({
    id: edge.id,
    from_id: edge.from_id,
    to_id: edge.to_id,
    edge_type: edge.edge_type,
    label_en: edge.label_en ?? null,
    label_zh: edge.label_zh ?? null,
    context_snippet: edge.context_snippet ?? null,
    weight: edge.weight ?? 1.0,
  });
}

/**
 * Delete an entity and cascade-remove edges, tags, and type-specific data.
 * SQLite foreign keys with ON DELETE CASCADE handle most of this,
 * but we also explicitly clean up the FTS index tags_text.
 */
export function deleteEntity(id: string): boolean {
  const db = getDb();

  const entity = db.prepare('SELECT id, type FROM entities WHERE id = ?').get(id) as Pick<Entity, 'id' | 'type'> | undefined;
  if (!entity) return false;

  const deleteTx = db.transaction(() => {
    // Remove from type-specific table (CASCADE should handle this, but be explicit)
    const entry = TYPE_TABLES[entity.type];
    if (entry) {
      db.prepare(`DELETE FROM ${entry.table} WHERE entity_id = ?`).run(id);
    }

    // Remove tag associations
    db.prepare('DELETE FROM entity_tags WHERE entity_id = ?').run(id);

    // Remove edges (both directions — CASCADE handles this too)
    db.prepare('DELETE FROM edges WHERE from_id = ? OR to_id = ?').run(id, id);

    // Remove media references
    db.prepare('UPDATE media SET entity_id = NULL WHERE entity_id = ?').run(id);

    // Remove run records if experiment
    if (entity.type === 'experiment') {
      db.prepare('DELETE FROM run_records WHERE experiment_id = ?').run(id);
    }

    // Remove integrity issues
    db.prepare('DELETE FROM integrity_issues WHERE entity_id = ?').run(id);

    // Remove the entity itself (triggers FTS delete via trigger)
    db.prepare('DELETE FROM entities WHERE id = ?').run(id);
  });

  deleteTx();
  return true;
}

/**
 * Set tags for an entity, replacing any existing tag associations.
 */
export function setEntityTags(entityId: string, tagIds: string[]): void {
  const db = getDb();

  const setTx = db.transaction(() => {
    db.prepare('DELETE FROM entity_tags WHERE entity_id = ?').run(entityId);

    const insert = db.prepare('INSERT OR IGNORE INTO entity_tags (entity_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      insert.run(entityId, tagId);
    }

    // Update the FTS tags_text column
    const tags = db.prepare(`
      SELECT GROUP_CONCAT(COALESCE(t.name_en, '') || ' ' || COALESCE(t.name_zh, ''), ' ') as tags_text
      FROM tags t INNER JOIN entity_tags et ON et.tag_id = t.id
      WHERE et.entity_id = ?
    `).get(entityId) as { tags_text: string | null } | undefined;

    // Force an UPDATE on entities to trigger FTS re-index
    // We touch updated_at to propagate the tags_text change
    db.prepare('UPDATE entities SET updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\') WHERE id = ?').run(entityId);

    // Manually update FTS tags_text since triggers only see entity columns
    const entity = db.prepare('SELECT rowid, * FROM entities WHERE id = ?').get(entityId) as (Entity & { rowid: number }) | undefined;
    if (entity) {
      db.prepare(`
        INSERT INTO search_index(search_index, rowid, id, title_en, title_zh, summary_en, summary_zh, body_en, body_zh, tags_text)
        VALUES ('delete', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entity.rowid, entity.id, entity.title_en, entity.title_zh,
        entity.summary_en, entity.summary_zh, entity.body_en, entity.body_zh, ''
      );
      db.prepare(`
        INSERT INTO search_index(rowid, id, title_en, title_zh, summary_en, summary_zh, body_en, body_zh, tags_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entity.rowid, entity.id, entity.title_en, entity.title_zh,
        entity.summary_en, entity.summary_zh, entity.body_en, entity.body_zh,
        tags?.tags_text ?? ''
      );
    }
  });

  setTx();
}

/**
 * Get facet counts for a given entity type and field.
 * Useful for building filter UIs.
 */
export function getFacetCounts(type: string | undefined, field: string): FacetCount[] {
  const db = getDb();

  const allowedFields = new Set([
    'status', 'visibility', 'type', 'owner_role', 'source_of_truth_kind',
  ]);
  if (!allowedFields.has(field)) {
    throw new Error(`Facet field "${field}" is not allowed. Use one of: ${[...allowedFields].join(', ')}`);
  }

  const params: Record<string, unknown> = {};
  let where = `WHERE ${field} IS NOT NULL`;
  if (type) {
    params.type = type;
    where += ' AND type = @type';
  }

  const sql = `
    SELECT ${field} as value, COUNT(*) as count
    FROM entities
    ${where}
    GROUP BY ${field}
    ORDER BY count DESC
  `;

  return db.prepare(sql).all(params) as FacetCount[];
}

/**
 * Get a curated view by ID and resolve its entities.
 */
export function getCuratedView(viewId: string): { view: CuratedView; entities: Entity[] } | null {
  const db = getDb();

  const view = db.prepare('SELECT * FROM curated_views WHERE id = ?').get(viewId) as CuratedView | undefined;
  if (!view) return null;

  let entities: Entity[] = [];

  // If there's an explicit allowlist, use it
  if (view.entity_allowlist) {
    try {
      const ids = JSON.parse(view.entity_allowlist) as string[];
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(', ');
        entities = db.prepare(`SELECT * FROM entities WHERE id IN (${placeholders}) ORDER BY updated_at DESC`).all(...ids) as Entity[];
      }
    } catch {
      // Invalid JSON — fall through to filter_config
    }
  }

  // If no allowlist results, try filter_config
  if (entities.length === 0 && view.filter_config) {
    try {
      const config = JSON.parse(view.filter_config) as ListFilters & { type?: string };
      const result = listEntities(config.type, config);
      entities = result.items;
    } catch {
      // Invalid filter config — return empty
    }
  }

  return { view, entities };
}

/**
 * Full-text search across entities.
 * Returns entities ranked by relevance.
 */
export function searchEntities(
  query: string,
  options: { type?: string; visibility?: string | string[]; limit?: number; offset?: number } = {}
): { items: Entity[]; total: number } {
  const db = getDb();
  const params: Record<string, unknown> = { query };
  const conditions: string[] = [];

  if (options.type) {
    params.type = options.type;
    conditions.push('e.type = @type');
  }

  if (options.visibility) {
    if (Array.isArray(options.visibility)) {
      const placeholders = options.visibility.map((_, i) => `@vis${i}`);
      options.visibility.forEach((v, i) => { params[`vis${i}`] = v; });
      conditions.push(`e.visibility IN (${placeholders.join(', ')})`);
    } else {
      params.singleVis = options.visibility;
      conditions.push('e.visibility = @singleVis');
    }
  }

  const whereExtra = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  const limit = Math.min(200, Math.max(1, options.limit ?? 50));
  const offset = Math.max(0, options.offset ?? 0);
  params._limit = limit;
  params._offset = offset;

  const countSql = `
    SELECT COUNT(*) as total
    FROM search_index s
    INNER JOIN entities e ON e.id = s.id
    WHERE search_index MATCH @query ${whereExtra}
  `;
  const { total } = db.prepare(countSql).get(params) as { total: number };

  const dataSql = `
    SELECT e.*
    FROM search_index s
    INNER JOIN entities e ON e.id = s.id
    WHERE search_index MATCH @query ${whereExtra}
    ORDER BY s.rank
    LIMIT @_limit OFFSET @_offset
  `;
  const data = db.prepare(dataSql).all(params) as Entity[];

  return { items: data, total };
}

