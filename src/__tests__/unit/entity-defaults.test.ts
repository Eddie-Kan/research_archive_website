import { describe, it, expect } from 'vitest';
import { applyEntityDefaults } from '@/lib/admin/entity-defaults';
import { validateEntityData } from '@/lib/ingestion/validator';

/**
 * Tests that applyEntityDefaults fills in all required schema fields
 * so that a minimal entity from the create form passes Zod validation.
 */

function minimalEntity(type: string, extra: Record<string, unknown> = {}) {
  return {
    id: 'test-001',
    type,
    title: { en: 'Test', 'zh-Hans': '测试' },
    summary: { en: 'Summary', 'zh-Hans': '摘要' },
    status: 'active',
    visibility: 'private',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...extra,
  };
}

describe('applyEntityDefaults', () => {
  it('should add missing base fields (links, authorship.contributors)', () => {
    const entity: Record<string, unknown> = minimalEntity('note');
    applyEntityDefaults(entity);

    expect(entity.links).toEqual([]);
    expect((entity.authorship as any).owner_role).toBe('owner');
    expect((entity.authorship as any).contributors).toEqual([]);
    expect(entity.source_of_truth).toEqual({ kind: 'file', pointer: '' });
  });

  it('should not overwrite user-provided values', () => {
    const entity: Record<string, unknown> = minimalEntity('note', {
      links: ['link1'],
      authorship: { owner_role: 'lead', contributors: ['alice'] },
      note_type: 'literature',
    });
    applyEntityDefaults(entity);

    expect(entity.links).toEqual(['link1']);
    expect((entity.authorship as any).owner_role).toBe('lead');
    expect((entity.authorship as any).contributors).toEqual(['alice']);
    expect((entity as any).note_type).toBe('literature');
  });

  it('should add note-specific defaults (body_mdx_id, related_entities)', () => {
    const entity: Record<string, unknown> = minimalEntity('note');
    applyEntityDefaults(entity);

    expect(entity.body_mdx_id).toBe('test-001.body');
    expect(entity.related_entities).toEqual([]);
    expect(entity.note_type).toBe('technical');
  });

  it('should add project-specific defaults', () => {
    const entity: Record<string, unknown> = minimalEntity('project');
    applyEntityDefaults(entity);

    expect(entity.project_kind).toBe('side');
    expect(entity.methods).toEqual([]);
    expect(entity.material_systems).toEqual([]);
    expect(entity.key_results).toEqual([]);
    expect((entity.artifacts as any).repos).toEqual([]);
    expect((entity.timeline as any).start_date).toBe('');
  });

  it('should add collaborator-specific defaults (contact_links as object)', () => {
    const entity: Record<string, unknown> = minimalEntity('collaborator');
    applyEntityDefaults(entity);

    expect(entity.contact_links).toEqual({});
    expect(entity.name).toBe('');
    expect(entity.role).toBe('');
    expect(entity.affiliation).toBe('');
  });
});

describe('applyEntityDefaults + validateEntityData integration', () => {
  const ALL_TYPES = [
    'project', 'publication', 'experiment', 'dataset', 'model', 'repo',
    'note', 'lit_review', 'meeting', 'idea', 'skill', 'method',
    'material_system', 'metric', 'collaborator', 'institution', 'media',
  ];

  for (const type of ALL_TYPES) {
    it(`minimal ${type} entity should pass validation after defaults`, () => {
      const entity: Record<string, unknown> = minimalEntity(type);
      applyEntityDefaults(entity);
      const result = validateEntityData(entity);

      if (!result.success) {
        // Show which fields still fail for debugging
        throw new Error(
          `Validation failed for type "${type}":\n${result.errors.join('\n')}`
        );
      }
      expect(result.success).toBe(true);
    });
  }
});
