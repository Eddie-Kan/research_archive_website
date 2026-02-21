import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function getContentDir(): string {
  return process.env.CONTENT_REPO_PATH || './content-repo';
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedEntityFile {
  /** Raw parsed JSON data from the entity file */
  data: Record<string, unknown>;
  /** Absolute path to the source file */
  filePath: string;
  /** Entity type derived from parent directory name */
  inferredType: string;
}

export interface ParsedMdxFile {
  /** Frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
  /** MDX body content with frontmatter stripped */
  body: string;
  /** Absolute path to the source file */
  filePath: string;
}

export interface WikiLink {
  /** The raw entity ID extracted from [[entity-id]] */
  entityId: string;
  /** Optional display text from [[entity-id|display text]] */
  displayText?: string;
  /** Character offset in the source content where the link starts */
  offset: number;
}

export interface LocaleCompleteness {
  en: number;
  'zh-Hans': number;
}

// ─── Entity File Parser ─────────────────────────────────────────────────────

/**
 * Reads a JSON entity file and returns the parsed data along with metadata
 * about the file location. The inferredType is derived from the parent
 * directory name (e.g., "projects" -> "project").
 */
export function parseEntityFile(filePath: string): ParsedEntityFile {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Entity file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON in ${absolutePath}: ${message}`);
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error(`Entity file must contain a JSON object: ${absolutePath}`);
  }

  // Infer entity type from parent directory name, singularizing common patterns
  const parentDir = path.basename(path.dirname(absolutePath));
  const inferredType = singularize(parentDir);

  return { data, filePath: absolutePath, inferredType };
}

// ─── MDX Frontmatter Parser ────────────────────────────────────────────────

/**
 * Reads an MDX file, extracts gray-matter frontmatter and the body content.
 * Returns null if the file does not exist.
 */
export function parseMdxFrontmatter(mdxPath: string): ParsedMdxFile | null {
  const absolutePath = path.resolve(mdxPath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(raw);

  return {
    frontmatter: frontmatter as Record<string, unknown>,
    body: body.trim(),
    filePath: absolutePath,
  };
}

/**
 * Loads the MDX body for a given entity ID and locale from the docs directory.
 * Returns an empty string if the file does not exist.
 */
export function loadEntityMdxBody(entityId: string, locale: string): string {
  const docsDir = path.join(getContentDir(), 'docs');
  const mdxPath = path.join(docsDir, `${entityId}.${locale}.mdx`);

  if (!fs.existsSync(mdxPath)) {
    return '';
  }

  const raw = fs.readFileSync(mdxPath, 'utf-8');
  // Strip frontmatter block if present
  return raw.replace(/^---[\s\S]*?---\n?/, '').trim();
}

// ─── Wiki Link Extraction ───────────────────────────────────────────────────

/**
 * Finds all [[entity-id]] and [[entity-id|display text]] style wiki links
 * in MDX content. Used for computing backlinks between entities.
 *
 * Supports:
 *   [[some-entity-id]]
 *   [[some-entity-id|Human-readable label]]
 */
export function extractWikiLinks(mdxContent: string): WikiLink[] {
  const links: WikiLink[] = [];
  // Match [[...]] patterns, capturing the inner content
  const pattern = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(mdxContent)) !== null) {
    const inner = match[1];
    const offset = match.index;

    // Check for pipe-separated display text: [[id|display]]
    const pipeIndex = inner.indexOf('|');
    if (pipeIndex !== -1) {
      const entityId = inner.slice(0, pipeIndex).trim();
      const displayText = inner.slice(pipeIndex + 1).trim();
      if (entityId) {
        links.push({ entityId, displayText, offset });
      }
    } else {
      const entityId = inner.trim();
      if (entityId) {
        links.push({ entityId, offset });
      }
    }
  }

  return links;
}

/**
 * Collects all wiki-link backlinks for a given entity by scanning all MDX
 * files in the docs directory. Returns an array of entity IDs that link
 * to the target entity.
 */
export function findBacklinks(targetEntityId: string): string[] {
  const docsDir = path.join(getContentDir(), 'docs');

  if (!fs.existsSync(docsDir)) {
    return [];
  }

  const mdxFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.mdx'));
  const backlinks: Set<string> = new Set();

  for (const file of mdxFiles) {
    const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
    const links = extractWikiLinks(content);

    for (const link of links) {
      if (link.entityId === targetEntityId) {
        // Extract the source entity ID from the filename pattern: {entityId}.{locale}.mdx
        const parts = file.split('.');
        if (parts.length >= 3) {
          const sourceEntityId = parts.slice(0, -2).join('.');
          backlinks.add(sourceEntityId);
        }
      }
    }
  }

  return Array.from(backlinks);
}

// ─── Locale Completeness ────────────────────────────────────────────────────

/** Fields on the base entity that carry bilingual text */
const BILINGUAL_BASE_FIELDS = ['title', 'summary'];

/** Additional bilingual fields per entity type */
const BILINGUAL_TYPE_FIELDS: Record<string, string[]> = {
  project: ['problem_statement', 'contributions', 'headline', 'impact_story', 'highlights'],
  publication: ['venue', 'abstract'],
  experiment: ['hypothesis', 'protocol'],
  dataset: ['description'],
  model: ['architecture'],
  note: [],
  idea: ['problem', 'proposed_approach'],
  lit_review: ['scope', 'synthesis', 'takeaways'],
  meeting: ['agenda', 'notes_content'],
  skill: ['name'],
  method: ['name', 'description'],
  material_system: ['name'],
  metric: ['name', 'definition'],
  collaborator: [],
  institution: [],
  media: [],
};

/**
 * Calculates the percentage of bilingual fields that are filled for each
 * locale. Examines both base entity fields (title, summary) and type-specific
 * bilingual fields.
 *
 * Returns values between 0 and 1 for each locale.
 */
export function computeLocaleCompleteness(entity: Record<string, unknown>): LocaleCompleteness {
  const entityType = entity.type as string;
  const typeFields = BILINGUAL_TYPE_FIELDS[entityType] || [];
  const allFields = [...BILINGUAL_BASE_FIELDS, ...typeFields];

  if (allFields.length === 0) {
    return { en: 1, 'zh-Hans': 1 };
  }

  let enFilled = 0;
  let zhFilled = 0;

  for (const field of allFields) {
    const value = entity[field] as Record<string, string> | undefined;
    if (value && typeof value === 'object') {
      if (typeof value.en === 'string' && value.en.trim().length > 0) {
        enFilled++;
      }
      if (typeof value['zh-Hans'] === 'string' && value['zh-Hans'].trim().length > 0) {
        zhFilled++;
      }
    }
  }

  // Also check MDX body files for completeness
  const entityId = entity.id as string | undefined;
  if (entityId) {
    const bodyEn = loadEntityMdxBody(entityId, 'en');
    const bodyZh = loadEntityMdxBody(entityId, 'zh-Hans');
    const totalWithBody = allFields.length + 1;

    const enScore = (enFilled + (bodyEn ? 1 : 0)) / totalWithBody;
    const zhScore = (zhFilled + (bodyZh ? 1 : 0)) / totalWithBody;

    return {
      en: Math.round(enScore * 100) / 100,
      'zh-Hans': Math.round(zhScore * 100) / 100,
    };
  }

  return {
    en: Math.round((enFilled / allFields.length) * 100) / 100,
    'zh-Hans': Math.round((zhFilled / allFields.length) * 100) / 100,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Naive singularization for directory names -> entity type mapping.
 * Handles common patterns in this project's content-repo structure.
 */
function singularize(dirName: string): string {
  const mapping: Record<string, string> = {
    projects: 'project',
    publications: 'publication',
    experiments: 'experiment',
    datasets: 'dataset',
    models: 'model',
    repos: 'repo',
    notes: 'note',
    'lit-reviews': 'lit_review',
    meetings: 'meeting',
    ideas: 'idea',
    skills: 'skill',
    methods: 'method',
    materials: 'material_system',
    metrics: 'metric',
    collaborators: 'collaborator',
    institutions: 'institution',
    media: 'media',
  };

  return mapping[dirName] || dirName;
}
