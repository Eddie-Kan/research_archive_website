import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '../db/index';
import { parseEntityFile, loadEntityMdxBody } from './parser';
import { validateEntityData, validateEdgeData } from './validator';
import { indexEntity, rebuildSearchIndex } from '../search/fts';

function getContentDir(): string {
  return process.env.CONTENT_REPO_PATH || './content-repo';
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IngestResult {
  entities: { total: number; valid: number; invalid: number; updated: number };
  edges: { total: number; valid: number; invalid: number };
  issues: string[];
  duration_ms: number;
}

// ─── Full Ingestion ─────────────────────────────────────────────────────────

/**
 * Full re-index: scans all entity JSON files under content-repo/entities/,
 * validates each against the Zod schema, upserts into SQLite, indexes into
 * FTS5, processes edges, and verifies referential integrity.
 *
 * The entire operation runs inside a single SQLite transaction for atomicity.
 */
export async function runFullIngestion(): Promise<IngestResult> {
  const start = Date.now();
  const result: IngestResult = {
    entities: { total: 0, valid: 0, invalid: 0, updated: 0 },
    edges: { total: 0, valid: 0, invalid: 0 },
    issues: [],
    duration_ms: 0,
  };
  const db = getDb();

  // Clear stale integrity issues before re-scan
  db.prepare('DELETE FROM integrity_issues').run();

  const transaction = db.transaction(() => {
    // Scan entity directories
    const entitiesDir = path.join(getContentDir(), 'entities');
    if (!fs.existsSync(entitiesDir)) {
      result.issues.push(`Entities directory not found: ${entitiesDir}`);
      return;
    }

    const entityTypes = fs.readdirSync(entitiesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const typeDir of entityTypes) {
      const typePath = path.join(entitiesDir, typeDir);
      const files = fs.readdirSync(typePath).filter(f => f.endsWith('.json'));

      for (const file of files) {
        result.entities.total++;
        try {
          const filePath = path.join(typePath, file);
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const raw = JSON.parse(rawContent);

          // Compute content-addressable checksum for change detection
          const checksum = crypto
            .createHash('sha256')
            .update(rawContent)
            .digest('hex');

          // Check if entity already exists with same checksum (skip if unchanged)
          const existing = db
            .prepare('SELECT checksum FROM entities WHERE id = ?')
            .get(raw.id) as { checksum: string } | undefined;

          if (existing && existing.checksum === checksum) {
            result.entities.valid++;
            result.entities.updated++; // counted but not re-written
            continue;
          }

          // Validate against Zod schema
          const validation = validateEntityData(raw);
          if (!validation.success) {
            result.entities.invalid++;
            result.issues.push(`${filePath}: ${validation.errors.join('; ')}`);
            recordIssue(db, raw.id || file, 'schema-violation', validation.errors.join('; '));
            continue;
          }

          const entity = validation.entity!;

          // Load MDX body content for both locales
          const bodyEn = loadEntityMdxBody(entity.id, 'en');
          const bodyZh = loadEntityMdxBody(entity.id, 'zh-Hans');

          // Upsert into the entities table and type-specific extension table
          upsertEntityToDb(db, entity, checksum, bodyEn, bodyZh);

          // Index for full-text search
          indexEntity(db, entity, bodyEn, bodyZh);

          result.entities.valid++;
        } catch (err: unknown) {
          result.entities.invalid++;
          const message = err instanceof Error ? err.message : String(err);
          result.issues.push(`${file}: ${message}`);
        }
      }
    }

    // Process edges file if it exists
    const edgesFile = path.join(getContentDir(), 'entities', 'edges.json');
    if (fs.existsSync(edgesFile)) {
      try {
        const edgesRaw = JSON.parse(fs.readFileSync(edgesFile, 'utf-8'));
        const edgesArray = Array.isArray(edgesRaw) ? edgesRaw : [];

        for (const edgeData of edgesArray) {
          result.edges.total++;
          const ev = validateEdgeData(edgeData);
          if (!ev.success) {
            result.edges.invalid++;
            const edgeId = edgeData?.id || 'unknown';
            result.issues.push(`edge ${edgeId}: ${ev.errors.join('; ')}`);
            continue;
          }
          upsertEdgeToDb(db, ev.edge!);
          result.edges.valid++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.issues.push(`edges.json: ${message}`);
      }
    }

    // Verify referential integrity of all edges
    const brokenEdges = db.prepare(`
      SELECT e.id, e.from_id, e.to_id FROM edges e
      LEFT JOIN entities ent1 ON e.from_id = ent1.id
      LEFT JOIN entities ent2 ON e.to_id = ent2.id
      WHERE ent1.id IS NULL OR ent2.id IS NULL
    `).all() as Array<{ id: string; from_id: string; to_id: string }>;

    for (const broken of brokenEdges) {
      result.issues.push(`Broken edge ${broken.id}: references non-existent entity`);
      recordIssue(
        db,
        broken.id,
        'broken-link',
        `from=${broken.from_id} to=${broken.to_id}`
      );
    }
  });

  transaction();

  result.duration_ms = Date.now() - start;
  return result;
}

// ─── Single Entity Ingestion ────────────────────────────────────────────────

/**
 * Incremental update for a single entity file. Validates, upserts, and
 * re-indexes just the one entity without touching anything else.
 */
export async function ingestSingleEntity(
  filePath: string
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const absolutePath = path.resolve(filePath);
    const rawContent = fs.readFileSync(absolutePath, 'utf-8');
    const raw = JSON.parse(rawContent);

    const checksum = crypto
      .createHash('sha256')
      .update(rawContent)
      .digest('hex');

    const validation = validateEntityData(raw);
    if (!validation.success) {
      return { success: false, errors: validation.errors };
    }

    const entity = validation.entity!;
    const db = getDb();
    const bodyEn = loadEntityMdxBody(entity.id, 'en');
    const bodyZh = loadEntityMdxBody(entity.id, 'zh-Hans');

    db.transaction(() => {
      upsertEntityToDb(db, entity, checksum, bodyEn, bodyZh);
      indexEntity(db, entity, bodyEn, bodyZh);
    })();

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [message] };
  }
}

// ─── Delete Entity ──────────────────────────────────────────────────────────

/**
 * Removes an entity and all its associated data (tags, type-specific row,
 * edges, FTS entry) from the database. Cascading foreign keys handle most
 * cleanup, but we explicitly remove the FTS entry.
 */
export { deleteEntity } from '../db/queries';

// ─── DB Upsert Helpers ──────────────────────────────────────────────────────

function upsertEntityToDb(
  db: ReturnType<typeof getDb>,
  entity: any,
  checksum: string,
  bodyEn: string,
  bodyZh: string
) {
  db.prepare(`
    INSERT INTO entities (
      id, type, title_en, title_zh, summary_en, summary_zh,
      created_at, updated_at, status, visibility, slug, cover_media_id,
      checksum, source_of_truth_kind, source_of_truth_pointer,
      owner_role, raw_metadata, body_en, body_zh
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type=excluded.type, title_en=excluded.title_en, title_zh=excluded.title_zh,
      summary_en=excluded.summary_en, summary_zh=excluded.summary_zh,
      updated_at=excluded.updated_at, status=excluded.status,
      visibility=excluded.visibility, slug=excluded.slug,
      cover_media_id=excluded.cover_media_id, checksum=excluded.checksum,
      source_of_truth_kind=excluded.source_of_truth_kind,
      source_of_truth_pointer=excluded.source_of_truth_pointer,
      owner_role=excluded.owner_role, raw_metadata=excluded.raw_metadata,
      body_en=excluded.body_en, body_zh=excluded.body_zh
  `).run(
    entity.id,
    entity.type,
    entity.title?.en || '',
    entity.title?.['zh-Hans'] || '',
    entity.summary?.en || '',
    entity.summary?.['zh-Hans'] || '',
    entity.created_at,
    entity.updated_at,
    entity.status,
    entity.visibility,
    entity.slug || null,
    entity.cover_media_id || null,
    checksum,
    entity.source_of_truth?.kind || 'file',
    entity.source_of_truth?.pointer || '',
    entity.authorship?.owner_role || 'owner',
    JSON.stringify(entity),
    bodyEn,
    bodyZh
  );

  // Sync tags — ensure each tag exists in the tags table first
  db.prepare('DELETE FROM entity_tags WHERE entity_id = ?').run(entity.id);
  if (entity.tags?.length) {
    const ensureTag = db.prepare(
      'INSERT OR IGNORE INTO tags (id, name_en, category) VALUES (?, ?, ?)'
    );
    const insertTag = db.prepare(
      'INSERT OR IGNORE INTO entity_tags (entity_id, tag_id) VALUES (?, ?)'
    );
    for (const tag of entity.tags) {
      ensureTag.run(tag, tag, 'custom');
      insertTag.run(entity.id, tag);
    }
  }

  // Upsert type-specific extension table
  upsertTypeSpecific(db, entity);
}

function upsertTypeSpecific(db: ReturnType<typeof getDb>, entity: any) {
  switch (entity.type) {
    case 'project':
      db.prepare(`
        INSERT INTO projects (
          entity_id, project_kind, research_area,
          problem_statement_en, problem_statement_zh,
          contributions_en, contributions_zh,
          start_date, end_date, advisor_id, institution_id,
          headline_en, headline_zh, impact_story_en, impact_story_zh
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          project_kind=excluded.project_kind, research_area=excluded.research_area,
          problem_statement_en=excluded.problem_statement_en,
          problem_statement_zh=excluded.problem_statement_zh,
          contributions_en=excluded.contributions_en,
          contributions_zh=excluded.contributions_zh,
          start_date=excluded.start_date, end_date=excluded.end_date,
          advisor_id=excluded.advisor_id, institution_id=excluded.institution_id,
          headline_en=excluded.headline_en, headline_zh=excluded.headline_zh,
          impact_story_en=excluded.impact_story_en, impact_story_zh=excluded.impact_story_zh
      `).run(
        entity.id, entity.project_kind, entity.research_area,
        entity.problem_statement?.en, entity.problem_statement?.['zh-Hans'],
        entity.contributions?.en, entity.contributions?.['zh-Hans'],
        entity.timeline?.start_date, entity.timeline?.end_date,
        entity.advisor_id, entity.institution_id,
        entity.headline?.en, entity.headline?.['zh-Hans'],
        entity.impact_story?.en, entity.impact_story?.['zh-Hans']
      );
      break;

    case 'publication':
      db.prepare(`
        INSERT INTO publications (
          entity_id, publication_type, venue_en, venue_zh,
          pub_date, abstract_en, abstract_zh, doi, arxiv, bibtex, peer_review_status
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          publication_type=excluded.publication_type,
          venue_en=excluded.venue_en, venue_zh=excluded.venue_zh,
          pub_date=excluded.pub_date,
          abstract_en=excluded.abstract_en, abstract_zh=excluded.abstract_zh,
          doi=excluded.doi, arxiv=excluded.arxiv, bibtex=excluded.bibtex,
          peer_review_status=excluded.peer_review_status
      `).run(
        entity.id, entity.publication_type,
        entity.venue?.en, entity.venue?.['zh-Hans'],
        entity.date,
        entity.abstract?.en, entity.abstract?.['zh-Hans'],
        entity.identifiers?.doi, entity.identifiers?.arxiv,
        entity.bibtex, entity.peer_review_status
      );
      break;

    case 'experiment':
      db.prepare(`
        INSERT INTO experiments (
          entity_id, experiment_type, hypothesis_en, hypothesis_zh,
          protocol_en, protocol_zh, reproducibility
        ) VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          experiment_type=excluded.experiment_type,
          hypothesis_en=excluded.hypothesis_en, hypothesis_zh=excluded.hypothesis_zh,
          protocol_en=excluded.protocol_en, protocol_zh=excluded.protocol_zh,
          reproducibility=excluded.reproducibility
      `).run(
        entity.id, entity.experiment_type,
        entity.hypothesis?.en, entity.hypothesis?.['zh-Hans'],
        entity.protocol?.en, entity.protocol?.['zh-Hans'],
        JSON.stringify(entity.reproducibility)
      );
      break;

    case 'dataset':
      db.prepare(`
        INSERT INTO datasets (
          entity_id, dataset_kind, description_en, description_zh,
          schema_def, license, provenance,
          storage_location, storage_format, storage_size, storage_checksum
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          dataset_kind=excluded.dataset_kind,
          description_en=excluded.description_en, description_zh=excluded.description_zh,
          schema_def=excluded.schema_def, license=excluded.license,
          provenance=excluded.provenance,
          storage_location=excluded.storage_location, storage_format=excluded.storage_format,
          storage_size=excluded.storage_size, storage_checksum=excluded.storage_checksum
      `).run(
        entity.id, entity.dataset_kind,
        entity.description?.en, entity.description?.['zh-Hans'],
        JSON.stringify(entity.schema_def), entity.license,
        JSON.stringify(entity.provenance),
        entity.storage?.location, entity.storage?.format,
        entity.storage?.size_bytes, entity.storage?.checksum
      );
      break;

    case 'model':
      db.prepare(`
        INSERT INTO models (
          entity_id, model_kind, task, architecture_en, architecture_zh, model_artifacts
        ) VALUES (?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          model_kind=excluded.model_kind, task=excluded.task,
          architecture_en=excluded.architecture_en, architecture_zh=excluded.architecture_zh,
          model_artifacts=excluded.model_artifacts
      `).run(
        entity.id, entity.model_kind, entity.task,
        entity.architecture?.en, entity.architecture?.['zh-Hans'],
        JSON.stringify(entity.model_artifacts)
      );
      break;

    case 'repo':
      db.prepare(`
        INSERT INTO repos (
          entity_id, repo_kind, remote_url, local_path, default_branch, license
        ) VALUES (?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          repo_kind=excluded.repo_kind, remote_url=excluded.remote_url,
          local_path=excluded.local_path, default_branch=excluded.default_branch,
          license=excluded.license
      `).run(
        entity.id, entity.repo_kind,
        entity.remote_url, entity.local_path,
        entity.default_branch, entity.license
      );
      break;

    case 'note':
      db.prepare(`
        INSERT INTO notes (entity_id, note_type, body_mdx_id, canonicality)
        VALUES (?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          note_type=excluded.note_type, body_mdx_id=excluded.body_mdx_id,
          canonicality=excluded.canonicality
      `).run(entity.id, entity.note_type, entity.body_mdx_id, entity.canonicality);
      break;

    case 'idea':
      db.prepare(`
        INSERT INTO ideas (
          entity_id, idea_kind, problem_en, problem_zh,
          proposed_approach_en, proposed_approach_zh,
          expected_value, idea_status
        ) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          idea_kind=excluded.idea_kind,
          problem_en=excluded.problem_en, problem_zh=excluded.problem_zh,
          proposed_approach_en=excluded.proposed_approach_en,
          proposed_approach_zh=excluded.proposed_approach_zh,
          expected_value=excluded.expected_value, idea_status=excluded.idea_status
      `).run(
        entity.id, entity.idea_kind,
        entity.problem?.en, entity.problem?.['zh-Hans'],
        entity.proposed_approach?.en, entity.proposed_approach?.['zh-Hans'],
        JSON.stringify(entity.expected_value),
        entity.idea_status || 'new'
      );
      break;

    case 'lit_review':
      db.prepare(`
        INSERT INTO lit_reviews (entity_id, scope_en, scope_zh, synthesis_en, synthesis_zh, takeaways_en, takeaways_zh)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          scope_en=excluded.scope_en, scope_zh=excluded.scope_zh,
          synthesis_en=excluded.synthesis_en, synthesis_zh=excluded.synthesis_zh,
          takeaways_en=excluded.takeaways_en, takeaways_zh=excluded.takeaways_zh
      `).run(
        entity.id,
        entity.scope?.en, entity.scope?.['zh-Hans'],
        entity.synthesis?.en, entity.synthesis?.['zh-Hans'],
        entity.takeaways?.en, entity.takeaways?.['zh-Hans']
      );
      break;

    case 'meeting':
      db.prepare(`
        INSERT INTO meetings (entity_id, date_time, agenda_en, agenda_zh, notes_en, notes_zh, action_items)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          date_time=excluded.date_time, agenda_en=excluded.agenda_en, agenda_zh=excluded.agenda_zh,
          notes_en=excluded.notes_en, notes_zh=excluded.notes_zh, action_items=excluded.action_items
      `).run(
        entity.id, entity.date_time,
        entity.agenda?.en, entity.agenda?.['zh-Hans'],
        entity.notes_content?.en, entity.notes_content?.['zh-Hans'],
        JSON.stringify(entity.action_items)
      );
      break;

    case 'skill':
      db.prepare(`
        INSERT INTO skills (entity_id, category, proficiency) VALUES (?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET category=excluded.category, proficiency=excluded.proficiency
      `).run(entity.id, entity.category, entity.proficiency);
      break;

    case 'method':
      db.prepare(`
        INSERT INTO methods (entity_id, domain, description_en, description_zh) VALUES (?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          domain=excluded.domain, description_en=excluded.description_en, description_zh=excluded.description_zh
      `).run(entity.id, entity.domain, entity.description?.en, entity.description?.['zh-Hans']);
      break;

    case 'material_system':
      db.prepare(`
        INSERT INTO material_systems (entity_id, composition, structure_type) VALUES (?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET composition=excluded.composition, structure_type=excluded.structure_type
      `).run(entity.id, entity.composition, entity.structure_type);
      break;

    case 'metric':
      db.prepare(`
        INSERT INTO metrics (entity_id, definition_en, definition_zh, unit, higher_is_better) VALUES (?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          definition_en=excluded.definition_en, definition_zh=excluded.definition_zh,
          unit=excluded.unit, higher_is_better=excluded.higher_is_better
      `).run(
        entity.id,
        entity.definition?.en, entity.definition?.['zh-Hans'],
        entity.unit, entity.higher_is_better ? 1 : 0
      );
      break;

    case 'collaborator':
      db.prepare(`
        INSERT INTO collaborators (entity_id, name, role, affiliation, website, orcid) VALUES (?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          name=excluded.name, role=excluded.role, affiliation=excluded.affiliation,
          website=excluded.website, orcid=excluded.orcid
      `).run(
        entity.id, entity.name, entity.role, entity.affiliation,
        entity.contact_links?.website, entity.contact_links?.orcid
      );
      break;

    case 'institution':
      db.prepare(`
        INSERT INTO institutions (entity_id, name, location, department, website) VALUES (?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          name=excluded.name, location=excluded.location,
          department=excluded.department, website=excluded.website
      `).run(entity.id, entity.name, entity.location, entity.department, entity.website);
      break;

    case 'media':
      db.prepare(`
        INSERT INTO media_items (entity_id, media_type, source_path, checksum, size_bytes, preview_path, provenance_entity_id)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(entity_id) DO UPDATE SET
          media_type=excluded.media_type, source_path=excluded.source_path,
          checksum=excluded.checksum, size_bytes=excluded.size_bytes,
          preview_path=excluded.preview_path, provenance_entity_id=excluded.provenance_entity_id
      `).run(
        entity.id, entity.media_type, entity.source_path,
        entity.checksum, entity.size_bytes, entity.preview_path, entity.provenance_entity_id
      );
      // Also upsert into the media attachments table so read queries find this entity
      db.prepare(`
        INSERT INTO media (id, entity_id, media_type, source_path, checksum, size_bytes, preview_path, provenance_entity_id)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          media_type=excluded.media_type, source_path=excluded.source_path,
          checksum=excluded.checksum, size_bytes=excluded.size_bytes,
          preview_path=excluded.preview_path, provenance_entity_id=excluded.provenance_entity_id
      `).run(
        entity.id, entity.id, entity.media_type, entity.source_path,
        entity.checksum, entity.size_bytes, entity.preview_path, entity.provenance_entity_id
      );
      break;
  }
}

function upsertEdgeToDb(db: ReturnType<typeof getDb>, edge: any) {
  db.prepare(`
    INSERT INTO edges (
      id, from_id, to_id, edge_type, created_at,
      label_en, label_zh, context_snippet, weight
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      from_id=excluded.from_id, to_id=excluded.to_id,
      edge_type=excluded.edge_type,
      label_en=excluded.label_en, label_zh=excluded.label_zh,
      context_snippet=excluded.context_snippet, weight=excluded.weight
  `).run(
    edge.id, edge.from_id, edge.to_id, edge.edge_type, edge.created_at,
    edge.label?.en, edge.label?.['zh-Hans'],
    edge.context_snippet, edge.weight || 1.0
  );
}

function recordIssue(
  db: ReturnType<typeof getDb>,
  entityId: string,
  issueType: string,
  message: string
) {
  db.prepare(`
    INSERT INTO integrity_issues (entity_id, issue_type, message, detected_at)
    VALUES (?, ?, ?, ?)
  `).run(entityId, issueType, message, new Date().toISOString());
}
