import { describe, it, expect } from 'vitest';
import { edgeTypeLabel, entityTypeLabel } from '@/lib/admin/label-helpers';

/**
 * Tests that label helpers return i18n keys (not raw tokens)
 * for edge types and entity types used in the dashboard + edge UI.
 */

// Minimal mock translator: returns the key itself so we can verify the key path
const mockT = (key: string) => `[[${key}]]`;

describe('edgeTypeLabel', () => {
  const EDGE_TYPES = [
    'project_contains', 'produced', 'evaluated_on', 'cites',
    'derived_from', 'implements', 'collaborates_with', 'related_to', 'supersedes',
  ];

  for (const et of EDGE_TYPES) {
    it(`should return i18n key for edge type "${et}"`, () => {
      const label = edgeTypeLabel(et, mockT);
      expect(label).toBe(`[[admin.options.edgeType.${et}]]`);
    });
  }
});

describe('entityTypeLabel', () => {
  const ENTITY_TYPES = [
    'project', 'publication', 'experiment', 'dataset', 'model', 'repo', 'note',
    'lit_review', 'meeting', 'idea', 'skill', 'method', 'material_system',
    'metric', 'collaborator', 'institution', 'media',
  ];

  for (const type of ENTITY_TYPES) {
    it(`should return i18n key for entity type "${type}"`, () => {
      const label = entityTypeLabel(type, mockT);
      // Should NOT return the raw type string
      expect(label).not.toBe(type);
      expect(label).toMatch(/^\[\[entity\./);
    });
  }

  it('should fall back to raw string for unknown type', () => {
    expect(entityTypeLabel('unknown_type', mockT)).toBe('unknown_type');
  });
});
