import type Database from 'better-sqlite3';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FacetValue {
  value: string;
  count: number;
  label_en?: string;
  label_zh?: string;
}

export interface TimeRangeBucket {
  period: string;
  count: number;
}

export interface FacetFilters {
  type?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

// ─── Generic Facet Query ────────────────────────────────────────────────────

/**
 * Returns distinct values with counts for a given column on the entities table.
 * Applies optional filters so facet counts reflect the current filter state.
 */
export function getFacetValues(
  db: Database.Database,
  field: string,
  filters: FacetFilters = {}
): FacetValue[] {
  // Whitelist allowed fields to prevent SQL injection
  const allowedFields = ['type', 'status', 'visibility', 'owner_role'];
  if (!allowedFields.includes(field)) {
    throw new Error(`Facet field "${field}" is not allowed. Use one of: ${allowedFields.join(', ')}`);
  }

  const { conditions, params } = buildFilterClauses(filters);
  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT ${field} as value, COUNT(*) as count
    FROM entities e
    ${whereClause}
    GROUP BY ${field}
    ORDER BY count DESC
  `).all(...params) as Array<{ value: string; count: number }>;

  return rows.map(r => ({ value: r.value, count: r.count }));
}

// ─── Tag Facets ─────────────────────────────────────────────────────────────

/**
 * Returns the top tags with counts, optionally filtered by tag category.
 * Joins through entity_tags to count how many matching entities use each tag.
 */
export function getTagFacets(
  db: Database.Database,
  filters: FacetFilters = {},
  options: { limit?: number; category?: string } = {}
): FacetValue[] {
  const { limit = 30, category } = options;
  const { conditions, params } = buildFilterClauses(filters);

  const tagConditions: string[] = [];
  const tagParams: any[] = [];

  if (category) {
    tagConditions.push('t.category = ?');
    tagParams.push(category);
  }

  const entityWhere = conditions.length ? 'AND ' + conditions.join(' AND ') : '';
  const tagWhere = tagConditions.length ? 'AND ' + tagConditions.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT et.tag_id as value, COUNT(DISTINCT et.entity_id) as count,
           t.name_en as label_en, t.name_zh as label_zh
    FROM entity_tags et
    JOIN entities e ON et.entity_id = e.id
    LEFT JOIN tags t ON et.tag_id = t.id
    WHERE 1=1 ${entityWhere} ${tagWhere}
    GROUP BY et.tag_id
    ORDER BY count DESC
    LIMIT ?
  `).all(...params, ...tagParams, limit) as Array<{
    value: string;
    count: number;
    label_en: string | null;
    label_zh: string | null;
  }>;

  return rows.map(r => ({
    value: r.value,
    count: r.count,
    label_en: r.label_en || undefined,
    label_zh: r.label_zh || undefined,
  }));
}

// ─── Method Facets ──────────────────────────────────────────────────────────

/**
 * Returns method entities referenced by projects, with counts of how many
 * projects use each method. Joins through the edges table with edge_type
 * 'implements' or through the raw_metadata methods array.
 */
export function getMethodFacets(
  db: Database.Database,
  filters: FacetFilters = {},
  options: { limit?: number } = {}
): FacetValue[] {
  const { limit = 20 } = options;
  const { conditions, params } = buildFilterClauses(filters);
  const entityWhere = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

  // Methods are stored as entity references in edges or in raw_metadata.
  // Query edges where from is a project and to is a method entity.
  const rows = db.prepare(`
    SELECT m.id as value, COUNT(DISTINCT ed.from_id) as count,
           m.title_en as label_en, m.title_zh as label_zh
    FROM edges ed
    JOIN entities m ON ed.to_id = m.id AND m.type = 'method'
    JOIN entities e ON ed.from_id = e.id
    WHERE ed.edge_type IN ('implements', 'related_to')
    ${entityWhere}
    GROUP BY m.id
    ORDER BY count DESC
    LIMIT ?
  `).all(...params, limit) as Array<{
    value: string;
    count: number;
    label_en: string | null;
    label_zh: string | null;
  }>;

  return rows.map(r => ({
    value: r.value,
    count: r.count,
    label_en: r.label_en || undefined,
    label_zh: r.label_zh || undefined,
  }));
}

// ─── Material Facets ────────────────────────────────────────────────────────

/**
 * Returns material_system entities referenced by projects, with counts.
 * Similar to method facets but for material systems.
 */
export function getMaterialFacets(
  db: Database.Database,
  filters: FacetFilters = {},
  options: { limit?: number } = {}
): FacetValue[] {
  const { limit = 20 } = options;
  const { conditions, params } = buildFilterClauses(filters);
  const entityWhere = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT ms.id as value, COUNT(DISTINCT ed.from_id) as count,
           ms.title_en as label_en, ms.title_zh as label_zh
    FROM edges ed
    JOIN entities ms ON ed.to_id = ms.id AND ms.type = 'material_system'
    JOIN entities e ON ed.from_id = e.id
    WHERE ed.edge_type IN ('related_to', 'project_contains')
    ${entityWhere}
    GROUP BY ms.id
    ORDER BY count DESC
    LIMIT ?
  `).all(...params, limit) as Array<{
    value: string;
    count: number;
    label_en: string | null;
    label_zh: string | null;
  }>;

  return rows.map(r => ({
    value: r.value,
    count: r.count,
    label_en: r.label_en || undefined,
    label_zh: r.label_zh || undefined,
  }));
}

// ─── Metric Facets ──────────────────────────────────────────────────────────

/**
 * Returns metric entities with counts of how many experiments or projects
 * reference them through edges.
 */
export function getMetricFacets(
  db: Database.Database,
  filters: FacetFilters = {},
  options: { limit?: number } = {}
): FacetValue[] {
  const { limit = 20 } = options;
  const { conditions, params } = buildFilterClauses(filters);
  const entityWhere = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT met.id as value, COUNT(DISTINCT ed.from_id) as count,
           met.title_en as label_en, met.title_zh as label_zh
    FROM edges ed
    JOIN entities met ON ed.to_id = met.id AND met.type = 'metric'
    JOIN entities e ON ed.from_id = e.id
    WHERE ed.edge_type IN ('evaluated_on', 'related_to')
    ${entityWhere}
    GROUP BY met.id
    ORDER BY count DESC
    LIMIT ?
  `).all(...params, limit) as Array<{
    value: string;
    count: number;
    label_en: string | null;
    label_zh: string | null;
  }>;

  return rows.map(r => ({
    value: r.value,
    count: r.count,
    label_en: r.label_en || undefined,
    label_zh: r.label_zh || undefined,
  }));
}

// ─── Time Range Facets ──────────────────────────────────────────────────────

/**
 * Groups entities by year or year-month and returns counts per period.
 * Useful for timeline visualizations and date-range filter UI.
 */
export function getTimeRangeFacets(
  db: Database.Database,
  filters: FacetFilters = {},
  options: { granularity?: 'year' | 'month' } = {}
): TimeRangeBucket[] {
  const { granularity = 'year' } = options;
  const { conditions, params } = buildFilterClauses(filters);
  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const dateExpr =
    granularity === 'month'
      ? "strftime('%Y-%m', e.created_at)"
      : "strftime('%Y', e.created_at)";

  const rows = db.prepare(`
    SELECT ${dateExpr} as period, COUNT(*) as count
    FROM entities e
    ${whereClause}
    GROUP BY period
    ORDER BY period ASC
  `).all(...params) as Array<{ period: string; count: number }>;

  return rows.map(r => ({ period: r.period, count: r.count }));
}

/**
 * Returns time range facets based on project start_date rather than
 * entity created_at. Useful for research timeline views.
 */
export function getProjectTimelineFacets(
  db: Database.Database,
  options: { granularity?: 'year' | 'month' } = {}
): TimeRangeBucket[] {
  const { granularity = 'year' } = options;

  const dateExpr =
    granularity === 'month'
      ? "strftime('%Y-%m', p.start_date)"
      : "strftime('%Y', p.start_date)";

  const rows = db.prepare(`
    SELECT ${dateExpr} as period, COUNT(*) as count
    FROM projects p
    JOIN entities e ON p.entity_id = e.id
    WHERE p.start_date IS NOT NULL AND e.status != 'archived'
    GROUP BY period
    ORDER BY period ASC
  `).all() as Array<{ period: string; count: number }>;

  return rows.map(r => ({ period: r.period, count: r.count }));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildFilterClauses(filters: FacetFilters): {
  conditions: string[];
  params: any[];
} {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.type) {
    conditions.push('e.type = ?');
    params.push(filters.type);
  }

  if (filters.status) {
    conditions.push('e.status = ?');
    params.push(filters.status);
  }

  if (filters.visibility) {
    conditions.push('e.visibility = ?');
    params.push(filters.visibility);
  }

  if (filters.dateFrom) {
    conditions.push('e.created_at >= ?');
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push('e.created_at <= ?');
    params.push(filters.dateTo);
  }

  if (filters.tags?.length) {
    const placeholders = filters.tags.map(() => '?').join(',');
    conditions.push(
      `e.id IN (SELECT entity_id FROM entity_tags WHERE tag_id IN (${placeholders}))`
    );
    params.push(...filters.tags);
  }

  return { conditions, params };
}
