import type { Visibility } from '@schema/types';

export type ViewMode = 'private' | 'public' | 'curated';

export interface ViewContext {
  mode: ViewMode;
  viewId?: string; // curated view ID
  allowedVisibilities: Visibility[];
}

// Get the current view context from request/session
export function getViewContext(mode: ViewMode, viewId?: string): ViewContext {
  switch (mode) {
    case 'private':
      return { mode, allowedVisibilities: ['private', 'unlisted', 'public'] };
    case 'public':
      return { mode, allowedVisibilities: ['public'] };
    case 'curated':
      return { mode, viewId, allowedVisibilities: ['unlisted', 'public'] };
  }
}

// SQL WHERE clause fragment for visibility filtering
export function visibilityFilter(ctx: ViewContext): { sql: string; params: string[] } {
  const placeholders = ctx.allowedVisibilities.map(() => '?').join(',');
  return {
    sql: `visibility IN (${placeholders})`,
    params: [...ctx.allowedVisibilities],
  };
}

// Check if a specific entity is visible in the current context
export function isEntityVisible(entityVisibility: Visibility, ctx: ViewContext): boolean {
  return ctx.allowedVisibilities.includes(entityVisibility);
}

// Strip private fields from entity data for public/curated views
export function sanitizeForPublic(entity: any, ctx: ViewContext): any {
  if (ctx.mode === 'private') return entity;

  const sanitized = { ...entity };
  // Remove private-only fields
  delete sanitized.confidentiality_note;
  delete sanitized.review_notes;
  delete sanitized.source_of_truth;

  // Remove raw_metadata (contains everything)
  if (sanitized.raw_metadata) {
    try {
      const meta = JSON.parse(sanitized.raw_metadata);
      delete meta.confidentiality_note;
      delete meta.review_notes;
      delete meta.source_of_truth;
      sanitized.raw_metadata = JSON.stringify(meta);
    } catch { /* ignore malformed JSON metadata */ }
  }

  return sanitized;
}

// Validate that a curated view's entity allowlist only contains visible entities
export function validateCuratedView(viewConfig: any, db: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!viewConfig.entity_allowlist) return { valid: true, issues };

  for (const entityId of viewConfig.entity_allowlist) {
    const entity = db.prepare('SELECT id, visibility FROM entities WHERE id = ?').get(entityId) as any;
    if (!entity) {
      issues.push(`Entity ${entityId} not found`);
    } else if (entity.visibility === 'private') {
      issues.push(`Entity ${entityId} is private but included in curated view`);
    }
  }

  return { valid: issues.length === 0, issues };
}
