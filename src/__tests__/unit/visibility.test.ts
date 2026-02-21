import { describe, it, expect } from 'vitest';
import { getViewContext, isEntityVisible, sanitizeForPublic, visibilityFilter } from '@/lib/permissions/visibility';

describe('Visibility Enforcement', () => {
  it('private mode should allow all visibilities', () => {
    const ctx = getViewContext('private');
    expect(ctx.allowedVisibilities).toEqual(['private', 'unlisted', 'public']);
  });

  it('public mode should only allow public', () => {
    const ctx = getViewContext('public');
    expect(ctx.allowedVisibilities).toEqual(['public']);
  });

  it('curated mode should allow unlisted and public', () => {
    const ctx = getViewContext('curated', 'view-1');
    expect(ctx.allowedVisibilities).toEqual(['unlisted', 'public']);
    expect(ctx.viewId).toBe('view-1');
  });

  it('isEntityVisible should correctly check visibility', () => {
    const publicCtx = getViewContext('public');
    expect(isEntityVisible('public', publicCtx)).toBe(true);
    expect(isEntityVisible('private', publicCtx)).toBe(false);
    expect(isEntityVisible('unlisted', publicCtx)).toBe(false);
  });

  it('sanitizeForPublic should strip private fields', () => {
    const entity = {
      id: '1',
      title_en: 'Test',
      confidentiality_note: 'secret',
      review_notes: 'internal',
      source_of_truth: { kind: 'file', pointer: '/path' },
    };

    const publicCtx = getViewContext('public');
    const sanitized = sanitizeForPublic(entity, publicCtx);
    expect(sanitized.confidentiality_note).toBeUndefined();
    expect(sanitized.review_notes).toBeUndefined();
    expect(sanitized.source_of_truth).toBeUndefined();
  });

  it('sanitizeForPublic should not strip fields in private mode', () => {
    const entity = {
      id: '1',
      confidentiality_note: 'secret',
      review_notes: 'internal',
    };

    const privateCtx = getViewContext('private');
    const sanitized = sanitizeForPublic(entity, privateCtx);
    expect(sanitized.confidentiality_note).toBe('secret');
  });

  it('visibilityFilter should generate correct SQL', () => {
    const publicCtx = getViewContext('public');
    const { sql, params } = visibilityFilter(publicCtx);
    expect(sql).toContain('visibility IN');
    expect(params).toEqual(['public']);
  });
});
