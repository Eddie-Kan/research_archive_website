import fs from 'fs';
import path from 'path';
import { getDb } from '../db/index';
import { getViewContext, visibilityFilter, sanitizeForPublic } from '../permissions/visibility';

export interface StaticExportOptions {
  outputDir: string;
  locale: 'en' | 'zh-Hans';
  viewId?: string; // if set, export only this curated view
  includeMedia: boolean;
}

export async function generateStaticSnapshot(options: StaticExportOptions): Promise<{ files: number; size: number }> {
  const { outputDir, locale, viewId, includeMedia } = options;
  const db = getDb();

  // Ensure output directory
  fs.mkdirSync(outputDir, { recursive: true });

  const ctx = viewId ? getViewContext('curated', viewId) : getViewContext('public');
  const { sql: visSql, params: visParams } = visibilityFilter(ctx);

  let entities: any[];

  if (viewId) {
    const view = db.prepare('SELECT * FROM curated_views WHERE id = ?').get(viewId) as any;
    if (!view) throw new Error(`View ${viewId} not found`);
    const allowlist = JSON.parse(view.entity_allowlist || '[]');
    if (allowlist.length) {
      const placeholders = allowlist.map(() => '?').join(',');
      entities = db.prepare(`SELECT * FROM entities WHERE id IN (${placeholders}) AND ${visSql}`).all(...allowlist, ...visParams) as any[];
    } else {
      entities = db.prepare(`SELECT * FROM entities WHERE ${visSql}`).all(...visParams) as any[];
    }
  } else {
    entities = db.prepare(`SELECT * FROM entities WHERE ${visSql}`).all(...visParams) as any[];
  }

  let fileCount = 0;
  let totalSize = 0;

  // Write entity JSON files
  const dataDir = path.join(outputDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  for (const entity of entities) {
    const sanitized = sanitizeForPublic(entity, ctx);
    const filePath = path.join(dataDir, `${entity.id}.json`);
    const content = JSON.stringify(sanitized, null, 2);
    fs.writeFileSync(filePath, content);
    fileCount++;
    totalSize += content.length;
  }

  // Write edges between exported entities only
  const entityIds = entities.map((e: any) => e.id);
  let edges: any[] = [];
  if (entityIds.length) {
    const ph = entityIds.map(() => '?').join(',');
    edges = db.prepare(`
      SELECT * FROM edges WHERE from_id IN (${ph}) AND to_id IN (${ph})
    `).all(...entityIds, ...entityIds) as any[];
  }

  const edgesPath = path.join(dataDir, 'edges.json');
  const edgesContent = JSON.stringify(edges, null, 2);
  fs.writeFileSync(edgesPath, edgesContent);
  fileCount++;
  totalSize += edgesContent.length;

  // Write index file
  const indexData = {
    generated_at: new Date().toISOString(),
    locale,
    entity_count: entities.length,
    edge_count: edges.length,
    entities: entities.map(e => ({
      id: e.id,
      type: e.type,
      title: locale === 'zh-Hans' ? (e.title_zh || e.title_en) : (e.title_en || e.title_zh),
      slug: e.slug,
    })),
  };
  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  fileCount++;

  // Copy media if requested
  if (includeMedia) {
    const mediaDir = path.join(outputDir, 'media');
    fs.mkdirSync(mediaDir, { recursive: true });
    const mediaStoragePath = process.env.MEDIA_STORAGE_PATH || './content-repo/media';
    const entityIds = entities.map(e => e.id);
    const mediaItems = entityIds.length
      ? db.prepare(`
          SELECT m.* FROM media m
          WHERE m.entity_id IN (${entityIds.map(() => '?').join(',')})
        `).all(...entityIds) as any[]
      : [];

    for (const item of mediaItems) {
      if (!item.source_path) continue;
      const resolved = path.resolve(mediaStoragePath, item.source_path);
      if (fs.existsSync(resolved)) {
        const dest = path.join(mediaDir, path.basename(item.source_path));
        fs.copyFileSync(resolved, dest);
        fileCount++;
        totalSize += item.size_bytes || 0;
      }
    }
  }

  return { files: fileCount, size: totalSize };
}
