import { test, expect } from '@playwright/test';

/**
 * E2E: Admin Create Entity page renders correctly in zh-Hans
 * with no English leakage in labels, options, or section headers.
 */

// Known English enum tokens that should NEVER appear as visible text in zh-Hans locale
const ENGLISH_ENUM_TOKENS = [
  'technical', 'literature', 'meeting', 'tutorial', 'reference',
  'canonical', 'draft', 'deprecated',
  'thesis', 'funded', 'collaboration', 'course',
  'journal', 'conference', 'preprint', 'report', 'book_chapter',
  'computational', 'wet_lab', 'simulation', 'field', 'survey',
  'raw', 'processed', 'curated', 'synthetic', 'benchmark',
  'classifier', 'regressor', 'generative', 'embedding', 'foundation',
  'application', 'library', 'analysis', 'infrastructure',
  'research_question', 'improvement',
  'exploring', 'validated', 'parked', 'rejected',
  'beginner', 'intermediate', 'advanced', 'expert',
];

// Hardcoded English labels that were present before the fix
const FORMER_ENGLISH_LABELS = [
  'Type-specific fields',
  'Project Kind',
  'Research Area',
  'Publication Type',
  'Note Type',
  'Canonicality',
  'Experiment Type',
  'Dataset Kind',
  'Model Kind',
  'Repo Kind',
  'Idea Kind',
  'Idea Status',
  'Proficiency',
  'Media Type',
];

const SENTINEL_PATTERN = /⟦MISSING:/;

test.describe('Admin Create Entity — zh-Hans i18n', () => {
  // This test requires the user to be authenticated.
  // In CI, set up auth via the API before running.
  test.beforeEach(async ({ page }) => {
    // Ensure password is configured (idempotent — 403 if already set)
    await page.request.post('/api/admin/auth/setup', {
      data: { password: process.env.ADMIN_PASSWORD || 'test123' },
    });
    const res = await page.request.post('/api/admin/auth', {
      data: { password: process.env.ADMIN_PASSWORD || 'test123' },
    });
    if (res.ok()) {
      const cookies = res.headers()['set-cookie'];
      if (cookies) {
        const match = cookies.match(/ek-admin-session=([^;]+)/);
        if (match) {
          await page.context().addCookies([{
            name: 'ek-admin-session',
            value: match[1],
            domain: 'localhost',
            path: '/',
          }]);
        }
      }
    }
  });

  test('renders form labels in Chinese, not English', async ({ page }) => {
    await page.goto('/zh-Hans/admin/entities/new', { waitUntil: 'networkidle' });

    const bodyText = await page.locator('body').innerText();

    // Should contain Chinese labels
    expect(bodyText).toContain('创建实体');       // admin.entities.create
    expect(bodyText).toContain('类型');           // admin.form.type
    expect(bodyText).toContain('类型专属字段');    // admin.form.typeSpecificFields
    expect(bodyText).toContain('标题');           // common.title
    expect(bodyText).toContain('状态');           // common.status
    expect(bodyText).toContain('可见性');         // common.visibility
    expect(bodyText).toContain('标签');           // common.tags

    // Should NOT contain the old hardcoded English labels
    for (const label of FORMER_ENGLISH_LABELS) {
      expect(bodyText).not.toContain(label);
    }

    // Should NOT contain missing-key sentinels
    expect(bodyText).not.toMatch(SENTINEL_PATTERN);
  });

  test('select options show Chinese labels, not raw enum values', async ({ page }) => {
    await page.goto('/zh-Hans/admin/entities/new', { waitUntil: 'networkidle' });

    // The default type is "note" — check its type-specific select options
    // Get all option text from select elements
    const optionTexts = await page.locator('select option').allInnerTexts();
    const optionSet = new Set(optionTexts.map(t => t.trim()).filter(Boolean));

    // None of the raw English enum tokens should appear as option text
    for (const token of ENGLISH_ENUM_TOKENS) {
      if (optionSet.has(token)) {
        throw new Error(`Raw English enum token "${token}" found in select options`);
      }
    }
  });

  test('entity type dropdown shows Chinese type names', async ({ page }) => {
    await page.goto('/zh-Hans/admin/entities/new', { waitUntil: 'networkidle' });

    // The type select should show Chinese entity type names
    const typeSelect = page.locator('select').first();
    const typeOptions = await typeSelect.locator('option').allInnerTexts();

    // Should contain Chinese type names
    expect(typeOptions).toContain('笔记');       // note
    expect(typeOptions).toContain('项目');       // project
    expect(typeOptions).toContain('论文');       // publication
    expect(typeOptions).toContain('实验');       // experiment

    // Should NOT contain raw snake_case type identifiers
    expect(typeOptions).not.toContain('note');
    expect(typeOptions).not.toContain('project');
    expect(typeOptions).not.toContain('publication');
    expect(typeOptions).not.toContain('lit_review');
    expect(typeOptions).not.toContain('material_system');
  });
});
