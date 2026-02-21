import fs from 'fs';
import path from 'path';

const CONTENT_DIR = process.env.CONTENT_REPO_PATH || './content-repo';

// Type → directory name mapping
const TYPE_DIR_MAP: Record<string, string> = {
  project: 'projects',
  publication: 'publications',
  experiment: 'experiments',
  dataset: 'datasets',
  model: 'models',
  repo: 'repos',
  note: 'notes',
  lit_review: 'lit-reviews',
  meeting: 'meetings',
  idea: 'ideas',
  skill: 'skills',
  method: 'methods',
  material_system: 'materials',
  metric: 'metrics',
  collaborator: 'collaborators',
  institution: 'institutions',
  media: 'media',
};

export function getEntityDir(entityType: string): string {
  const dir = TYPE_DIR_MAP[entityType];
  if (!dir) throw new Error(`Unknown entity type: ${entityType}`);
  return path.join(CONTENT_DIR, 'entities', dir);
}

export function getEntityFilePath(entityId: string, entityType: string): string {
  return path.join(getEntityDir(entityType), `${entityId}.json`);
}

export function getMdxFilePath(entityId: string, locale: string): string {
  return path.join(CONTENT_DIR, 'docs', `${entityId}.${locale}.mdx`);
}

export function getEdgesFilePath(): string {
  return path.join(CONTENT_DIR, 'entities', 'edges.json');
}

// ─── Write Operations ──────────────────────────────────────────────────────

export function writeEntityFile(entity: Record<string, unknown>): string {
  const entityType = entity.type as string;
  const entityId = entity.id as string;
  const dir = getEntityDir(entityType);

  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${entityId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(entity, null, 2), 'utf-8');
  return filePath;
}

export function writeMdxFile(entityId: string, locale: string, content: string): string {
  const docsDir = path.join(CONTENT_DIR, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });

  const filePath = path.join(docsDir, `${entityId}.${locale}.mdx`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function deleteEntityFiles(entityId: string, entityType: string): void {
  // Delete JSON file
  const jsonPath = getEntityFilePath(entityId, entityType);
  if (fs.existsSync(jsonPath)) {
    fs.unlinkSync(jsonPath);
  }

  // Delete MDX files for both locales
  for (const locale of ['en', 'zh-Hans']) {
    const mdxPath = getMdxFilePath(entityId, locale);
    if (fs.existsSync(mdxPath)) {
      fs.unlinkSync(mdxPath);
    }
  }
}

// ─── Edges File Operations ─────────────────────────────────────────────────

export function readEdgesFile(): unknown[] {
  const edgesPath = getEdgesFilePath();
  if (!fs.existsSync(edgesPath)) return [];
  try {
    const raw = fs.readFileSync(edgesPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeEdgesFile(edges: unknown[]): void {
  const edgesPath = getEdgesFilePath();
  const dir = path.dirname(edgesPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(edgesPath, JSON.stringify(edges, null, 2), 'utf-8');
}

export function addEdgeToFile(edge: Record<string, unknown>): void {
  const edges = readEdgesFile();
  edges.push(edge);
  writeEdgesFile(edges);
}

export function removeEdgeFromFile(edgeId: string): void {
  const edges = readEdgesFile() as Array<Record<string, unknown>>;
  const filtered = edges.filter(e => e.id !== edgeId);
  writeEdgesFile(filtered);
}

export function removeEntityEdgesFromFile(entityId: string): void {
  const edges = readEdgesFile() as Array<Record<string, unknown>>;
  const filtered = edges.filter(e => e.from_id !== entityId && e.to_id !== entityId);
  writeEdgesFile(filtered);
}
