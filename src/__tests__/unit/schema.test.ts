import { describe, it, expect } from 'vitest';
import { validateEntity, validateEdge } from '../../../packages/schema/src/validate';

describe('Schema Validation', () => {
  describe('validateEntity', () => {
    it('should validate a valid project entity', () => {
      const project = {
        id: '01HX1234567890ABCDEFGHIJK',
        type: 'project',
        title: { en: 'ML for Materials Discovery', 'zh-Hans': '材料发现中的机器学习' },
        summary: { en: 'Using ML to accelerate materials discovery', 'zh-Hans': '利用机器学习加速材料发现' },
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-06-01T12:00:00Z',
        status: 'active',
        visibility: 'public',
        tags: ['ml', 'materials'],
        links: [],
        authorship: { owner_role: 'lead', contributors: [] },
        source_of_truth: { kind: 'file', pointer: './content-repo/entities/projects/ml-materials.json' },
        project_kind: 'academic',
        research_area: 'ML for materials',
        problem_statement: { en: 'How to use ML for materials', 'zh-Hans': '如何使用机器学习进行材料研究' },
        contributions: { en: 'Novel GNN architecture', 'zh-Hans': '新型GNN架构' },
        methods: [],
        material_systems: [],
        key_results: [],
        timeline: { start_date: '2024-01-01' },
        artifacts: { repos: [], datasets: [], experiments: [], publications: [], notes: [] },
      };
      const result = validateEntity(project);
      expect(result.success).toBe(true);
    });

    it('should reject entity with missing required fields', () => {
      const invalid = { id: '01HX1234567890ABCDEFGHIJK', type: 'project' };
      const result = validateEntity(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject entity with invalid type', () => {
      const invalid = {
        id: '01HX1234567890ABCDEFGHIJK',
        type: 'invalid_type',
        title: { en: 'Test', 'zh-Hans': '测试' },
        summary: { en: 'Test', 'zh-Hans': '测试' },
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        status: 'active',
        visibility: 'public',
        tags: [],
        links: [],
        authorship: { owner_role: 'owner', contributors: [] },
        source_of_truth: { kind: 'file', pointer: '' },
      };
      const result = validateEntity(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate a valid publication entity', () => {
      const pub = {
        id: '01HX1234567890ABCDEFGHIJL',
        type: 'publication',
        title: { en: 'GNN for Crystal Property Prediction', 'zh-Hans': 'GNN用于晶体性质预测' },
        summary: { en: 'A novel GNN approach', 'zh-Hans': '一种新型GNN方法' },
        created_at: '2024-03-01T10:00:00Z',
        updated_at: '2024-03-01T10:00:00Z',
        status: 'completed',
        visibility: 'public',
        tags: ['gnn', 'crystals'],
        links: [],
        authorship: { owner_role: 'first_author', contributors: [] },
        source_of_truth: { kind: 'file', pointer: '' },
        publication_type: 'conference',
        venue: { en: 'NeurIPS 2024', 'zh-Hans': 'NeurIPS 2024' },
        date: '2024-12-01',
        authors: [],
        abstract: { en: 'We propose...', 'zh-Hans': '我们提出...' },
        identifiers: {},
        associated_projects: [],
      };
      const result = validateEntity(pub);
      expect(result.success).toBe(true);
    });

    it('should validate a valid note entity', () => {
      const note = {
        id: '01HX1234567890ABCDEFGHIJM',
        type: 'note',
        title: { en: 'Understanding Attention Mechanisms', 'zh-Hans': '理解注意力机制' },
        summary: { en: 'Notes on attention', 'zh-Hans': '关于注意力的笔记' },
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-01T10:00:00Z',
        status: 'active',
        visibility: 'private',
        tags: ['attention', 'transformers'],
        links: [],
        authorship: { owner_role: 'owner', contributors: [] },
        source_of_truth: { kind: 'file', pointer: '' },
        note_type: 'concept',
        body_mdx_id: '01HX1234567890ABCDEFGHIJM',
        related_entities: [],
      };
      const result = validateEntity(note);
      expect(result.success).toBe(true);
    });
  });

  describe('validateEdge', () => {
    it('should validate a valid edge', () => {
      const edge = {
        id: 'edge-001',
        from_id: '01HX1234567890ABCDEFGHIJK',
        to_id: '01HX1234567890ABCDEFGHIJL',
        edge_type: 'project_contains',
        created_at: '2024-01-15T10:00:00Z',
      };
      const result = validateEdge(edge);
      expect(result.success).toBe(true);
    });

    it('should reject edge with invalid type', () => {
      const edge = {
        id: 'edge-002',
        from_id: 'a',
        to_id: 'b',
        edge_type: 'invalid_edge_type',
        created_at: '2024-01-15T10:00:00Z',
      };
      const result = validateEdge(edge);
      expect(result.success).toBe(false);
    });
  });
});
