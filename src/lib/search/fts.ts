import type Database from 'better-sqlite3';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchOptions {
  query: string;
  locale?: 'en' | 'zh-Hans';
  type?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  methods?: string[];
  materials?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date_desc' | 'date_asc' | 'title';
}

export interface SearchResult {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  summary_en: string;
  summary_zh: string;
  snippet: string;
  rank: number;
  visibility: string;
  status: string;
  created_at: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets: {
    types: Record<string, number>;
    statuses: Record<string, number>;
    tags: Record<string, number>;
  };
  page: number;
  limit: number;
}

// ─── Indexing ────────────────────────────────────────────────────────────────

/**
 * Indexes a single entity into the FTS5 search_index virtual table.
 * Deletes any existing entry first to avoid duplicates, then inserts
 * the entity's bilingual text fields and tag text.
 */
export function indexEntity(
  db: Database.Database,
  entity: any,
  bodyEn: string,
  bodyZh: string
) {
  // Resolve tag IDs to tag names for searchable text
  const tagIds = entity.tags || [];
  let tagsText = '';
  if (tagIds.length) {
    const placeholders = tagIds.map(() => '?').join(',');
    const tagRows = db.prepare(
      `SELECT name_en, name_zh FROM tags WHERE id IN (${placeholders})`
    ).all(...tagIds) as Array<{ name_en: string | null; name_zh: string | null }>;
    tagsText = tagRows.map(t => [t.name_en, t.name_zh].filter(Boolean).join(' ')).join(' ');
  }

  // Remove existing FTS entry for this entity
  db.prepare('DELETE FROM search_index WHERE id = ?').run(entity.id);

  // Insert into FTS5 virtual table
  db.prepare(`
    INSERT INTO search_index (id, title_en, title_zh, summary_en, summary_zh, body_en, body_zh, tags_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entity.id,
    entity.title?.en || '',
    entity.title?.['zh-Hans'] || '',
    entity.summary?.en || '',
    entity.summary?.['zh-Hans'] || '',
    bodyEn,
    bodyZh,
    tagsText
  );
}

/**
 * Rebuilds the entire FTS index from the entities table. Clears the index
 * first, then re-inserts all entities with their tags. Use after bulk
 * operations or to recover from index corruption.
 */
export function rebuildSearchIndex(db: Database.Database) {
  db.prepare("INSERT INTO search_index(search_index) VALUES ('delete-all')").run();

  const entities = db.prepare(
    'SELECT id, title_en, title_zh, summary_en, summary_zh, body_en, body_zh FROM entities'
  ).all() as Array<{
    id: string;
    title_en: string;
    title_zh: string;
    summary_en: string;
    summary_zh: string;
    body_en: string;
    body_zh: string;
  }>;

  const insert = db.prepare(
    'INSERT INTO search_index (id, title_en, title_zh, summary_en, summary_zh, body_en, body_zh, tags_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  for (const e of entities) {
    const tags = db.prepare(
      `SELECT t.name_en, t.name_zh FROM entity_tags et
       JOIN tags t ON et.tag_id = t.id WHERE et.entity_id = ?`
    ).all(e.id) as Array<{ name_en: string | null; name_zh: string | null }>;
    const tagsText = tags.map(t => [t.name_en, t.name_zh].filter(Boolean).join(' ')).join(' ');
    insert.run(e.id, e.title_en, e.title_zh, e.summary_en, e.summary_zh, e.body_en, e.body_zh, tagsText);
  }
}

// ─── Search ─────────────────────────────────────────────────────────────────

/**
 * Full-text search with faceted filtering. Supports:
 * - FTS5 query matching across bilingual title, summary, body, and tags
 * - Filtering by type, status, visibility, tags, and date range
 * - Sorting by relevance, date, or title
 * - Pagination with page/limit
 * - Facet counts for types, statuses, and top tags
 *
 * When no query is provided, returns filtered results sorted by date.
 */
export function searchEntities(
  db: Database.Database,
  options: SearchOptions
): SearchResponse {
  const {
    query,
    type,
    status,
    visibility,
    tags,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sort = 'relevance',
  } = options;

  const params: any[] = [];
  const conditions: string[] = [];

  // Build filter conditions
  if (visibility) {
    conditions.push('e.visibility = ?');
    params.push(visibility);
  }

  if (type) {
    conditions.push('e.type = ?');
    params.push(type);
  }

  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }

  if (dateFrom) {
    conditions.push('e.created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('e.created_at <= ?');
    params.push(dateTo);
  }

  if (tags?.length) {
    const placeholders = tags.map(() => '?').join(',');
    conditions.push(
      `e.id IN (SELECT entity_id FROM entity_tags WHERE tag_id IN (${placeholders}))`
    );
    params.push(...tags);
  }

  const whereClause = conditions.length ? 'AND ' + conditions.join(' AND ') : '';
  const orderClause = buildOrderClause(sort);

  if (query && query.trim()) {
    return searchWithFts(db, query, params, whereClause, orderClause, page, limit, conditions);
  }

  return searchWithoutFts(db, params, whereClause, orderClause, page, limit, conditions);
}

// ─── FTS Search Path ────────────────────────────────────────────────────────

function searchWithFts(
  db: Database.Database,
  query: string,
  filterParams: any[],
  whereClause: string,
  orderClause: string,
  page: number,
  limit: number,
  conditions: string[]
): SearchResponse {
  // Sanitize query for FTS5: strip special characters but keep CJK and word chars
  const ftsQuery = sanitizeFtsQuery(query);

  if (!ftsQuery) {
    // If sanitization removed everything, fall back to no-query path
    return searchWithoutFts(db, filterParams, whereClause, buildOrderClause('date_desc'), page, limit, conditions);
  }

  const countSql = `
    SELECT COUNT(*) as total
    FROM search_index si
    JOIN entities e ON si.id = e.id
    WHERE search_index MATCH ?
    ${whereClause}
  `;

  const resultSql = `
    SELECT e.id, e.type, e.title_en, e.title_zh, e.summary_en, e.summary_zh,
           e.visibility, e.status, e.created_at,
           snippet(search_index, 4, '<mark>', '</mark>', '...', 32) as snippet,
           rank
    FROM search_index si
    JOIN entities e ON si.id = e.id
    WHERE search_index MATCH ?
    ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const searchParams = [ftsQuery, ...filterParams];
  const total = (db.prepare(countSql).get(...searchParams) as any)?.total || 0;
  const results = db.prepare(resultSql).all(
    ...searchParams,
    limit,
    (page - 1) * limit
  ) as SearchResult[];

  const facets = computeFacetsWithFts(db, ftsQuery, filterParams, conditions);

  return { results, total, facets, page, limit };
}

// ─── Non-FTS Search Path ────────────────────────────────────────────────────

function searchWithoutFts(
  db: Database.Database,
  filterParams: any[],
  whereClause: string,
  orderClause: string,
  page: number,
  limit: number,
  conditions: string[]
): SearchResponse {
  const countSql = `
    SELECT COUNT(*) as total FROM entities e WHERE 1=1 ${whereClause}
  `;

  const resultSql = `
    SELECT e.id, e.type, e.title_en, e.title_zh, e.summary_en, e.summary_zh,
           e.visibility, e.status, e.created_at,
           '' as snippet, 0 as rank
    FROM entities e
    WHERE 1=1 ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const total = (db.prepare(countSql).get(...filterParams) as any)?.total || 0;
  const results = db.prepare(resultSql).all(
    ...filterParams,
    limit,
    (page - 1) * limit
  ) as SearchResult[];

  const facets = computeFacetsWithoutFts(db, filterParams, conditions);

  return { results, total, facets, page, limit };
}

// ─── Facet Computation ──────────────────────────────────────────────────────

function computeFacetsWithFts(
  db: Database.Database,
  ftsQuery: string,
  filterParams: any[],
  conditions: string[]
): SearchResponse['facets'] {
  const whereClause = conditions.length ? 'AND ' + conditions.join(' AND ') : '';
  const baseParams = [ftsQuery, ...filterParams];

  const types = db.prepare(`
    SELECT e.type, COUNT(*) as count
    FROM search_index si JOIN entities e ON si.id = e.id
    WHERE search_index MATCH ? ${whereClause}
    GROUP BY e.type
  `).all(...baseParams) as Array<{ type: string; count: number }>;

  const statuses = db.prepare(`
    SELECT e.status, COUNT(*) as count
    FROM search_index si JOIN entities e ON si.id = e.id
    WHERE search_index MATCH ? ${whereClause}
    GROUP BY e.status
  `).all(...baseParams) as Array<{ status: string; count: number }>;

  const tagRows = db.prepare(`
    SELECT et.tag_id, COUNT(*) as count
    FROM search_index si
    JOIN entities e ON si.id = e.id
    JOIN entity_tags et ON e.id = et.entity_id
    WHERE search_index MATCH ? ${whereClause}
    GROUP BY et.tag_id ORDER BY count DESC LIMIT 20
  `).all(...baseParams) as Array<{ tag_id: string; count: number }>;

  return {
    types: Object.fromEntries(types.map(r => [r.type, r.count])),
    statuses: Object.fromEntries(statuses.map(r => [r.status, r.count])),
    tags: Object.fromEntries(tagRows.map(r => [r.tag_id, r.count])),
  };
}

function computeFacetsWithoutFts(
  db: Database.Database,
  filterParams: any[],
  conditions: string[]
): SearchResponse['facets'] {
  const whereClause = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

  const types = db.prepare(
    `SELECT type, COUNT(*) as count FROM entities e WHERE 1=1 ${whereClause} GROUP BY type`
  ).all(...filterParams) as Array<{ type: string; count: number }>;

  const statuses = db.prepare(
    `SELECT status, COUNT(*) as count FROM entities e WHERE 1=1 ${whereClause} GROUP BY status`
  ).all(...filterParams) as Array<{ status: string; count: number }>;

  const tagRows = db.prepare(`
    SELECT et.tag_id, COUNT(*) as count
    FROM entities e
    JOIN entity_tags et ON e.id = et.entity_id
    WHERE 1=1 ${whereClause}
    GROUP BY et.tag_id ORDER BY count DESC LIMIT 20
  `).all(...filterParams) as Array<{ tag_id: string; count: number }>;

  return {
    types: Object.fromEntries(types.map(r => [r.type, r.count])),
    statuses: Object.fromEntries(statuses.map(r => [r.status, r.count])),
    tags: Object.fromEntries(tagRows.map(r => [r.tag_id, r.count])),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildOrderClause(sort: string): string {
  switch (sort) {
    case 'relevance':
      return 'rank';
    case 'date_desc':
      return 'e.created_at DESC';
    case 'date_asc':
      return 'e.created_at ASC';
    case 'title':
      return 'e.title_en ASC';
    default:
      return 'rank';
  }
}

/**
 * Sanitizes a user query for FTS5. Removes characters that would cause
 * FTS5 syntax errors while preserving CJK characters and alphanumeric words.
 * Wraps individual terms in quotes to avoid FTS5 operator interpretation.
 */
function sanitizeFtsQuery(query: string): string {
  // Remove FTS5 special operators and punctuation, keep word chars and CJK
  const cleaned = query
    .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
    .trim();

  if (!cleaned) return '';

  // Split into tokens and wrap each in quotes to prevent FTS5 operator issues
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';

  // Join with spaces; FTS5 treats space-separated quoted terms as implicit AND
  return tokens.map(t => `"${t}"`).join(' ');
}
