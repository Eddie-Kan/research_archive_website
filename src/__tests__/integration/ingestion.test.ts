import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDb, closeDb } from '@/lib/db/index';

// Use a temp directory for test content
const TEST_DIR = path.join(os.tmpdir(), 'ek-archive-test-' + Date.now());
const TEST_DB = path.join(TEST_DIR, 'test.db');

describe('Ingestion Pipeline', () => {
  beforeAll(() => {
    // Set up test environment
    process.env.DATABASE_URL = `file:${TEST_DB}`;
    process.env.CONTENT_REPO_PATH = path.join(TEST_DIR, 'content');

    // Create test content structure
    const contentDir = path.join(TEST_DIR, 'content');
    fs.mkdirSync(path.join(contentDir, 'entities', 'projects'), { recursive: true });
    fs.mkdirSync(path.join(contentDir, 'docs'), { recursive: true });

    // Write a test entity
    const testProject = {
      id: 'test-project-001',
      type: 'project',
      title: { en: 'Test Project', 'zh-Hans': '测试项目' },
      summary: { en: 'A test project', 'zh-Hans': '一个测试项目' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      status: 'active',
      visibility: 'public',
      tags: ['test', 'ml'],
      links: [],
      authorship: { owner_role: 'lead', contributors: [] },
      source_of_truth: { kind: 'file', pointer: '' },
      project_kind: 'academic',
      research_area: 'ML for materials',
      problem_statement: { en: 'Test problem', 'zh-Hans': '测试问题' },
      contributions: { en: 'Test contributions', 'zh-Hans': '测试贡献' },
      methods: [],
      material_systems: [],
      key_results: [],
      timeline: { start_date: '2024-01-01' },
      artifacts: { repos: [], datasets: [], experiments: [], publications: [], notes: [] },
    };

    fs.writeFileSync(
      path.join(contentDir, 'entities', 'projects', 'test-project-001.json'),
      JSON.stringify(testProject, null, 2)
    );

    // Write test MDX
    fs.writeFileSync(
      path.join(contentDir, 'docs', 'test-project-001.en.mdx'),
      '# Test Project\n\nThis is a test project about ML for materials discovery.'
    );
    fs.writeFileSync(
      path.join(contentDir, 'docs', 'test-project-001.zh-Hans.mdx'),
      '# 测试项目\n\n这是一个关于材料发现中机器学习的测试项目。'
    );
  });

  afterAll(() => {
    closeDb();
    // Clean up
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should run migrations and create tables', async () => {
    const { runMigrations } = await import('@/lib/db/migrations/index');
    runMigrations();

    const db = getDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = tables.map((t: any) => t.name);

    expect(tableNames).toContain('entities');
    expect(tableNames).toContain('edges');
    expect(tableNames).toContain('entity_tags');
    expect(tableNames).toContain('search_index');
  });

  it('should ingest entities from content directory', async () => {
    const { runFullIngestion } = await import('@/lib/ingestion/pipeline');
    const result = await runFullIngestion();

    expect(result.entities.valid).toBeGreaterThanOrEqual(1);
    expect(result.entities.invalid).toBe(0);
  });

  it('should find ingested entity in database', () => {
    const db = getDb();
    const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get('test-project-001') as any;

    expect(entity).toBeDefined();
    expect(entity.type).toBe('project');
    expect(entity.title_en).toBe('Test Project');
    expect(entity.title_zh).toBe('测试项目');
    expect(entity.visibility).toBe('public');
  });

  it('should have indexed entity for full-text search', () => {
    const db = getDb();
    const results = db.prepare(
      "SELECT * FROM search_index WHERE search_index MATCH 'materials'"
    ).all() as any[];

    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should respect visibility in queries', () => {
    const db = getDb();

    // Public query should find public entities
    const publicResults = db.prepare(
      "SELECT * FROM entities WHERE visibility = 'public'"
    ).all() as any[];
    expect(publicResults.length).toBeGreaterThanOrEqual(1);

    // Private query should find nothing (our test entity is public)
    const privateOnly = db.prepare(
      "SELECT * FROM entities WHERE visibility = 'private'"
    ).all() as any[];
    expect(privateOnly.length).toBe(0);
  });
});
