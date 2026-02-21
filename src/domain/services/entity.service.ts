import { getDb } from '@/lib/db/index';
import type {
  EntityDetail,
  EntityListItem,
  ListFilters,
  PaginatedResult,
  DashboardStats,
  TimelineEvent,
  GraphData,
  GraphNode,
  GraphEdge,
  ViewMode,
} from '../types';

// ─── Visibility helpers ──────────────────────────────────────────────────────

/**
 * Returns a SQL fragment and named-parameter record that restricts rows
 * to those the current ViewMode is allowed to see.
 *
 * - private: no restriction (owner sees everything)
 * - public:  only visibility = 'public'
 *
 * For direct-access (getById), use directAccessVisibilityClause which
 * also allows 'unlisted' entities.
 */
function visibilityClause(
  mode: ViewMode,
  params: Record<string, unknown>,
  prefix = ''
): string {
  if (mode === 'private') return '1 = 1';
  const col = prefix ? `${prefix}.visibility` : 'visibility';
  params._vis = 'public';
  return `${col} = @_vis`;
}

/**
 * Like visibilityClause but also allows 'unlisted' entities.
 * Used for direct-access by ID (unlisted = accessible by link, not in listings).
 */
function directAccessVisibilityClause(
  mode: ViewMode,
  params: Record<string, unknown>,
  prefix = ''
): string {
  if (mode === 'private') return '1 = 1';
  const col = prefix ? `${prefix}.visibility` : 'visibility';
  return `${col} IN ('public', 'unlisted')`;
}

/**
 * Strip fields that should not leak in public mode.
 * In private mode the row is returned as-is.
 */
function sanitize<T extends Record<string, unknown>>(row: T, mode: ViewMode): T {
  if (mode === 'private') return row;
  const { raw_metadata: _rm, source_of_truth_kind: _sk, source_of_truth_pointer: _sp, owner_role: _or, ...safe } = row;
  return safe as T;
}

// ─── EntityService ───────────────────────────────────────────────────────────

export class EntityService {
  // ------------------------------------------------------------------
  // Single entity by ID
  // ------------------------------------------------------------------
  getById(id: string, mode: ViewMode = 'private'): EntityDetail | null {
    const db = getDb();
    const params: Record<string, unknown> = { id };
    const visSql = directAccessVisibilityClause(mode, params);

    const entity = db
      .prepare(`SELECT * FROM entities WHERE id = @id AND ${visSql}`)
      .get(params) as Record<string, unknown> | undefined;

    if (!entity) return null;

    const sanitized = sanitize(entity, mode);

    // Tags
    const tags = db
      .prepare('SELECT tag_id FROM entity_tags WHERE entity_id = @id')
      .all({ id }) as { tag_id: string }[];

    // Outgoing edges with resolved target info (filtered by visibility)
    const edgeParams: Record<string, unknown> = { id };
    const edgeVisSql = visibilityClause(mode, edgeParams, 'ent');
    const edgesOut = db
      .prepare(
        `SELECT e.*, ent.type AS rel_type, ent.title_en AS rel_title_en, ent.title_zh AS rel_title_zh
         FROM edges e
         JOIN entities ent ON e.to_id = ent.id
         WHERE e.from_id = @id AND ${edgeVisSql}`
      )
      .all(edgeParams) as Record<string, unknown>[];

    // Incoming edges (backlinks) with resolved source info (filtered by visibility)
    const edgeInParams: Record<string, unknown> = { id };
    const edgeInVisSql = visibilityClause(mode, edgeInParams, 'ent');
    const edgesIn = db
      .prepare(
        `SELECT e.*, ent.type AS rel_type, ent.title_en AS rel_title_en, ent.title_zh AS rel_title_zh
         FROM edges e
         JOIN entities ent ON e.from_id = ent.id
         WHERE e.to_id = @id AND ${edgeInVisSql}`
      )
      .all(edgeInParams) as Record<string, unknown>[];

    // Media
    const media = db
      .prepare('SELECT * FROM media WHERE entity_id = @id')
      .all({ id }) as Record<string, unknown>[];

    return {
      id: sanitized.id as string,
      type: sanitized.type as string,
      title_en: (sanitized.title_en as string) ?? '',
      title_zh: (sanitized.title_zh as string) ?? '',
      summary_en: (sanitized.summary_en as string) ?? '',
      summary_zh: (sanitized.summary_zh as string) ?? '',
      body_en: (sanitized.body_en as string) ?? '',
      body_zh: (sanitized.body_zh as string) ?? '',
      status: sanitized.status as string,
      visibility: sanitized.visibility as string,
      created_at: sanitized.created_at as string,
      updated_at: sanitized.updated_at as string,
      slug: sanitized.slug as string | undefined,
      raw_metadata: (sanitized.raw_metadata as string) ?? '{}',
      tags: tags.map((t) => t.tag_id),
      edges_out: edgesOut.map((e) => ({
        id: e.id as string,
        from_id: e.from_id as string,
        to_id: e.to_id as string,
        edge_type: e.edge_type as string,
        label_en: e.label_en as string | undefined,
        label_zh: e.label_zh as string | undefined,
        related_entity: e.rel_type
          ? {
              id: e.to_id as string,
              type: e.rel_type as string,
              title_en: (e.rel_title_en as string) ?? '',
              title_zh: (e.rel_title_zh as string) ?? '',
            }
          : undefined,
      })),
      edges_in: edgesIn.map((e) => ({
        id: e.id as string,
        from_id: e.from_id as string,
        to_id: e.to_id as string,
        edge_type: e.edge_type as string,
        label_en: e.label_en as string | undefined,
        label_zh: e.label_zh as string | undefined,
        related_entity: e.rel_type
          ? {
              id: e.from_id as string,
              type: e.rel_type as string,
              title_en: (e.rel_title_en as string) ?? '',
              title_zh: (e.rel_title_zh as string) ?? '',
            }
          : undefined,
      })),
      media: media.map((m) => ({
        id: m.id as string,
        media_type: (m.media_type as string) ?? '',
        source_path: (m.source_path as string) ?? '',
        preview_path: m.preview_path as string | undefined,
        size_bytes: (m.size_bytes as number) ?? 0,
      })),
    };
  }

  // ------------------------------------------------------------------
  // Paginated list with filters
  // ------------------------------------------------------------------
  list(
    filters: ListFilters,
    mode: ViewMode = 'private'
  ): PaginatedResult<EntityListItem> {
    const db = getDb();
    const params: Record<string, unknown> = {};
    const conditions: string[] = [visibilityClause(mode, params, 'e')];

    if (filters.type) {
      params.f_type = filters.type;
      conditions.push('e.type = @f_type');
    }
    if (filters.status) {
      params.f_status = filters.status;
      conditions.push('e.status = @f_status');
    }
    if (filters.visibility) {
      params.f_visibility = filters.visibility;
      conditions.push('e.visibility = @f_visibility');
    }
    if (filters.dateFrom) {
      params.f_dateFrom = filters.dateFrom;
      conditions.push('e.created_at >= @f_dateFrom');
    }
    if (filters.dateTo) {
      params.f_dateTo = filters.dateTo;
      conditions.push('e.created_at <= @f_dateTo');
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map((_, i) => `@f_tag${i}`);
      filters.tags.forEach((t, i) => {
        params[`f_tag${i}`] = t;
      });
      conditions.push(
        `e.id IN (SELECT entity_id FROM entity_tags WHERE tag_id IN (${tagPlaceholders.join(', ')}))`
      );
    }

    // FTS search
    let fromClause = 'entities e';
    if (filters.search) {
      params.f_search = filters.search;
      fromClause = `entities e INNER JOIN (
        SELECT id, rank FROM search_index WHERE search_index MATCH @f_search
      ) s ON e.id = s.id`;
    }

    const where = conditions.join(' AND ');

    const sortCol =
      filters.sort === 'title'
        ? 'e.title_en'
        : filters.sort === 'updated_at'
          ? 'e.updated_at'
          : 'e.created_at';
    const sortDir = filters.order === 'asc' ? 'ASC' : 'DESC';
    const orderClause = filters.search
      ? 'ORDER BY s.rank'
      : `ORDER BY ${sortCol} ${sortDir}`;

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;
    params._limit = limit;
    params._offset = offset;

    const total = (
      db
        .prepare(`SELECT COUNT(*) AS c FROM ${fromClause} WHERE ${where}`)
        .get(params) as { c: number }
    ).c;

    const rows = db
      .prepare(
        `SELECT e.id, e.type, e.title_en, e.title_zh, e.summary_en, e.summary_zh,
                e.status, e.visibility, e.created_at, e.updated_at, e.slug
         FROM ${fromClause}
         WHERE ${where}
         ${orderClause}
         LIMIT @_limit OFFSET @_offset`
      )
      .all(params) as Record<string, unknown>[];

    const tagStmt = db.prepare(
      'SELECT tag_id FROM entity_tags WHERE entity_id = @eid'
    );

    const items: EntityListItem[] = rows.map((row) => {
      const s = sanitize(row, mode);
      const rowTags = tagStmt.all({ eid: s.id }) as { tag_id: string }[];
      return {
        id: s.id as string,
        type: s.type as string,
        title_en: (s.title_en as string) ?? '',
        title_zh: (s.title_zh as string) ?? '',
        summary_en: (s.summary_en as string) ?? '',
        summary_zh: (s.summary_zh as string) ?? '',
        status: s.status as string,
        visibility: s.visibility as string,
        created_at: s.created_at as string,
        updated_at: s.updated_at as string,
        slug: s.slug as string | undefined,
        tags: rowTags.map((t) => t.tag_id),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ------------------------------------------------------------------
  // Dashboard aggregate stats
  // ------------------------------------------------------------------
  getDashboardStats(mode: ViewMode = 'private'): DashboardStats {
    const db = getDb();
    const params: Record<string, unknown> = {};
    const visSql = visibilityClause(mode, params);

    const total = (
      db
        .prepare(`SELECT COUNT(*) AS c FROM entities WHERE ${visSql}`)
        .get(params) as { c: number }
    ).c;

    const byType = db
      .prepare(
        `SELECT type, COUNT(*) AS c FROM entities WHERE ${visSql} GROUP BY type`
      )
      .all(params) as { type: string; c: number }[];

    const byStatus = db
      .prepare(
        `SELECT status, COUNT(*) AS c FROM entities WHERE ${visSql} GROUP BY status`
      )
      .all(params) as { status: string; c: number }[];

    const byVis = db
      .prepare(
        `SELECT visibility, COUNT(*) AS c FROM entities WHERE ${visSql} GROUP BY visibility`
      )
      .all(params) as { visibility: string; c: number }[];

    const recent = db
      .prepare(
        `SELECT id, type, title_en, title_zh, summary_en, summary_zh,
                status, visibility, created_at, updated_at, slug
         FROM entities WHERE ${visSql}
         ORDER BY updated_at DESC LIMIT 10`
      )
      .all(params) as Record<string, unknown>[];

    // Edge/media/integrity counts scoped to visible entities
    const edgeParams: Record<string, unknown> = {};
    const edgeVis1 = visibilityClause(mode, edgeParams, 'e1');
    const edgeVis2 = edgeVis1.replace(/e1\./g, 'e2.');
    const totalEdges = (
      db.prepare(
        `SELECT COUNT(*) AS c FROM edges ed
         JOIN entities e1 ON ed.from_id = e1.id
         JOIN entities e2 ON ed.to_id = e2.id
         WHERE ${edgeVis1} AND ${edgeVis2}`
      ).get(edgeParams) as { c: number }
    ).c;

    const mediaParams: Record<string, unknown> = {};
    const mediaVis = visibilityClause(mode, mediaParams, 'ent');
    const totalMedia = (
      db.prepare(
        `SELECT COUNT(*) AS c FROM media m
         JOIN entities ent ON m.entity_id = ent.id
         WHERE ${mediaVis}`
      ).get(mediaParams) as { c: number }
    ).c;

    const integrityIssues = mode === 'private'
      ? (db.prepare('SELECT COUNT(*) AS c FROM integrity_issues WHERE resolved_at IS NULL').get() as { c: number }).c
      : 0;

    return {
      total_entities: total,
      by_type: Object.fromEntries(byType.map((r) => [r.type, r.c])),
      by_status: Object.fromEntries(byStatus.map((r) => [r.status, r.c])),
      by_visibility: Object.fromEntries(
        byVis.map((r) => [r.visibility, r.c])
      ),
      recent_entities: recent.map((e) => ({
        id: e.id as string,
        type: e.type as string,
        title_en: (e.title_en as string) ?? '',
        title_zh: (e.title_zh as string) ?? '',
        summary_en: (e.summary_en as string) ?? '',
        summary_zh: (e.summary_zh as string) ?? '',
        status: e.status as string,
        visibility: e.visibility as string,
        created_at: e.created_at as string,
        updated_at: e.updated_at as string,
        slug: e.slug as string | undefined,
        tags: [],
      })),
      total_edges: totalEdges,
      total_media: totalMedia,
      integrity_issues: integrityIssues,
    };
  }

  // ------------------------------------------------------------------
  // Timeline (all entities ordered by creation date)
  // ------------------------------------------------------------------
  getTimeline(mode: ViewMode = 'private', projectId?: string): TimelineEvent[] {
    const db = getDb();
    const params: Record<string, unknown> = {};
    const visSql = visibilityClause(mode, params);

    if (projectId) {
      params.projectId = projectId;
      // Return the project itself + all entities connected via edges
      return db
        .prepare(
          `SELECT id, type, title_en, title_zh, created_at AS date, status
           FROM entities
           WHERE ${visSql} AND (
             id = @projectId
             OR id IN (SELECT to_id FROM edges WHERE from_id = @projectId)
             OR id IN (SELECT from_id FROM edges WHERE to_id = @projectId)
           )
           ORDER BY created_at DESC`
        )
        .all(params) as TimelineEvent[];
    }

    return db
      .prepare(
        `SELECT id, type, title_en, title_zh, created_at AS date, status
         FROM entities WHERE ${visSql}
         ORDER BY created_at DESC`
      )
      .all(params) as TimelineEvent[];
  }

  getProjectList(mode: ViewMode = 'private'): { id: string; title_en: string | null; title_zh: string | null }[] {
    const db = getDb();
    const params: Record<string, unknown> = { ptype: 'project' };
    const visSql = visibilityClause(mode, params);

    return db
      .prepare(
        `SELECT id, title_en, title_zh FROM entities
         WHERE type = @ptype AND ${visSql}
         ORDER BY updated_at DESC`
      )
      .all(params) as { id: string; title_en: string | null; title_zh: string | null }[];
  }

  // ------------------------------------------------------------------
  // Knowledge graph data
  // ------------------------------------------------------------------
  getGraphData(mode: ViewMode = 'private'): GraphData {
    const db = getDb();
    const params: Record<string, unknown> = {};
    const visSql = visibilityClause(mode, params);

    const nodes = db
      .prepare(
        `SELECT id, type, title_en, title_zh, type AS "group"
         FROM entities WHERE ${visSql}`
      )
      .all(params) as GraphNode[];

    // Only include edges where both endpoints are visible.
    // We join both endpoints against the entities table and apply the
    // visibility predicate on each.
    const edgeParams: Record<string, unknown> = {};
    const visSql1 = visibilityClause(mode, edgeParams, 'e1');
    // For the second endpoint we need a distinct parameter name when in
    // public mode, but the value is the same ('public'). Re-use @_vis.
    const visSql2 = visSql1.replace(/e1\./g, 'e2.');

    const edges = db
      .prepare(
        `SELECT e.from_id AS source, e.to_id AS target,
                e.edge_type AS type, e.weight
         FROM edges e
         JOIN entities e1 ON e.from_id = e1.id
         JOIN entities e2 ON e.to_id   = e2.id
         WHERE ${visSql1} AND ${visSql2}`
      )
      .all(edgeParams) as GraphEdge[];

    return { nodes, edges };
  }

  listMedia(): Array<{ id: string; entity_id: string; entity_title_en: string; entity_title_zh: string; entity_type: string; media_type: string; source_path: string; created_at: string }> {
    const db = getDb();
    return db.prepare(
      `SELECT m.id, m.entity_id, e.title_en AS entity_title_en, e.title_zh AS entity_title_zh,
              e.type AS entity_type, m.media_type, m.source_path, m.created_at
       FROM media m JOIN entities e ON m.entity_id = e.id
       ORDER BY m.created_at DESC`
    ).all() as any[];
  }

  listIntegrityIssues(): Array<{ id: string; entity_id: string; entity_title_en: string; entity_title_zh: string; issue_type: string; description: string; created_at: string }> {
    const db = getDb();
    return db.prepare(
      `SELECT i.id, i.entity_id, e.title_en AS entity_title_en, e.title_zh AS entity_title_zh,
              i.issue_type, i.message AS description, i.detected_at AS created_at
       FROM integrity_issues i LEFT JOIN entities e ON i.entity_id = e.id
       WHERE i.resolved_at IS NULL
       ORDER BY i.detected_at DESC`
    ).all() as any[];
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _service: EntityService | null = null;

export function getEntityService(): EntityService {
  if (!_service) _service = new EntityService();
  return _service;
}
