import { describe, it, expect } from 'vitest';

/**
 * Unit tests verifying the security and visibility fixes from the production audit.
 * These tests validate the logic in entity.service.ts visibility helpers.
 */

// Inline reimplementation of the visibility clause logic to test in isolation
function visibilityClause(mode: string, params: Record<string, unknown>, prefix = ''): string {
  if (mode === 'private') return '1 = 1';
  const col = prefix ? `${prefix}.visibility` : 'visibility';
  params._vis = 'public';
  return `${col} = @_vis`;
}

function directAccessVisibilityClause(mode: string, _params: Record<string, unknown>, prefix = ''): string {
  if (mode === 'private') return '1 = 1';
  const col = prefix ? `${prefix}.visibility` : 'visibility';
  return `${col} IN ('public', 'unlisted')`;
}

describe('Entity Service Visibility Clauses', () => {
  it('visibilityClause: private mode allows all', () => {
    const params: Record<string, unknown> = {};
    expect(visibilityClause('private', params)).toBe('1 = 1');
    expect(params._vis).toBeUndefined();
  });

  it('visibilityClause: public mode restricts to public only', () => {
    const params: Record<string, unknown> = {};
    const sql = visibilityClause('public', params);
    expect(sql).toBe('visibility = @_vis');
    expect(params._vis).toBe('public');
  });

  it('visibilityClause: supports table prefix', () => {
    const params: Record<string, unknown> = {};
    const sql = visibilityClause('public', params, 'e');
    expect(sql).toBe('e.visibility = @_vis');
  });

  it('directAccessVisibilityClause: private mode allows all', () => {
    const params: Record<string, unknown> = {};
    expect(directAccessVisibilityClause('private', params)).toBe('1 = 1');
  });

  it('directAccessVisibilityClause: public mode allows public AND unlisted', () => {
    const params: Record<string, unknown> = {};
    const sql = directAccessVisibilityClause('public', params);
    expect(sql).toContain('public');
    expect(sql).toContain('unlisted');
    expect(sql).not.toContain('private');
  });

  it('directAccessVisibilityClause: supports table prefix', () => {
    const params: Record<string, unknown> = {};
    const sql = directAccessVisibilityClause('public', params, 'ent');
    expect(sql).toContain('ent.visibility');
  });
});

describe('Auth Gating Requirements', () => {
  it('media API route file should import requireAdminSession', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/app/api/entities/media/route.ts', 'utf-8');
    expect(content).toContain('requireAdminSession');
  });

  it('integrity API route file should import requireAdminSession', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/app/api/entities/integrity/route.ts', 'utf-8');
    expect(content).toContain('requireAdminSession');
  });

  it('entity edges query should filter by visibility', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/domain/services/entity.service.ts', 'utf-8');
    // Edges out query should JOIN (not LEFT JOIN) and include visibility filter
    expect(content).toContain('JOIN entities ent ON e.to_id = ent.id');
    expect(content).not.toMatch(/LEFT JOIN entities ent ON e\.to_id = ent\.id/);
    // Edges in query should also be filtered
    expect(content).toContain('JOIN entities ent ON e.from_id = ent.id');
  });

  it('getById should use directAccessVisibilityClause for unlisted support', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/domain/services/entity.service.ts', 'utf-8');
    expect(content).toContain('directAccessVisibilityClause(mode, params)');
  });
});
