import type Database from 'better-sqlite3';

/**
 * Semantic (vector) search module for the research archive.
 *
 * DISABLED BY DEFAULT. This module provides a stub implementation that
 * returns empty results. To enable semantic search:
 *
 * 1. Install a local embedding model package, e.g.:
 *      npm install @xenova/transformers
 *    or use an API-based embedding service.
 *
 * 2. Create an embeddings table in the database:
 *      CREATE TABLE IF NOT EXISTS embeddings (
 *        entity_id TEXT PRIMARY KEY,
 *        vector    BLOB NOT NULL,
 *        model     TEXT NOT NULL,
 *        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
 *        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
 *      );
 *
 * 3. Set the SEMANTIC_SEARCH_ENABLED=true environment variable.
 *
 * 4. Implement computeEmbedding() below using your chosen model.
 *    For example, with @xenova/transformers:
 *
 *      import { pipeline } from '@xenova/transformers';
 *      const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
 *      const output = await embedder(text, { pooling: 'mean', normalize: true });
 *      return Array.from(output.data);
 *
 * 5. For vector similarity search at scale, consider sqlite-vss or
 *    a dedicated vector store. The brute-force cosine similarity
 *    approach below works for archives under ~10k entities.
 */

// ─── Configuration ──────────────────────────────────────────────────────────

const SEMANTIC_SEARCH_ENABLED = process.env.SEMANTIC_SEARCH_ENABLED === 'true';
const EMBEDDING_DIMENSIONS = 384; // MiniLM-L6-v2 default

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SemanticSearchOptions {
  query: string;
  locale?: 'en' | 'zh-Hans';
  type?: string;
  visibility?: string;
  limit?: number;
  threshold?: number;
}

export interface SemanticSearchResult {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  similarity: number;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  enabled: boolean;
  model: string | null;
}

// ─── Embedding Interface ────────────────────────────────────────────────────

// Lazy-loaded pipeline singleton
let embedderPromise: Promise<any> | null = null;

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    );
  }
  return embedderPromise;
}

/**
 * Computes a dense vector embedding for the given text.
 * Returns null when semantic search is disabled.
 */
export async function computeEmbedding(text: string): Promise<number[] | null> {
  if (!SEMANTIC_SEARCH_ENABLED) {
    return null;
  }

  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}

// ─── Indexing ────────────────────────────────────────────────────────────────

/**
 * Computes and stores the embedding for a single entity. Combines the
 * entity's title, summary, and body into a single text for embedding.
 *
 * No-op when semantic search is disabled.
 */
export async function indexEntityEmbedding(
  db: Database.Database,
  entityId: string,
  titleEn: string,
  summaryEn: string,
  bodyEn: string
): Promise<boolean> {
  if (!SEMANTIC_SEARCH_ENABLED) {
    return false;
  }

  const text = [titleEn, summaryEn, bodyEn].filter(Boolean).join(' ');
  const embedding = await computeEmbedding(text);

  if (!embedding) {
    return false;
  }

  const vectorBlob = float32ArrayToBuffer(new Float32Array(embedding));

  db.prepare(`
    INSERT INTO embeddings (entity_id, vector, model)
    VALUES (?, ?, ?)
    ON CONFLICT(entity_id) DO UPDATE SET
      vector = excluded.vector,
      model = excluded.model,
      created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).run(entityId, vectorBlob, 'all-MiniLM-L6-v2');

  return true;
}

/**
 * Rebuilds all entity embeddings. Iterates through every entity in the
 * database and recomputes its embedding vector.
 *
 * No-op when semantic search is disabled.
 */
export async function rebuildAllEmbeddings(db: Database.Database): Promise<number> {
  if (!SEMANTIC_SEARCH_ENABLED) {
    return 0;
  }

  const entities = db.prepare(
    'SELECT id, title_en, summary_en, body_en FROM entities'
  ).all() as Array<{
    id: string;
    title_en: string;
    summary_en: string;
    body_en: string;
  }>;

  let indexed = 0;
  for (const entity of entities) {
    const success = await indexEntityEmbedding(
      db,
      entity.id,
      entity.title_en,
      entity.summary_en,
      entity.body_en
    );
    if (success) indexed++;
  }

  return indexed;
}

// ─── Search ─────────────────────────────────────────────────────────────────

/**
 * Performs semantic similarity search. Computes the embedding for the query
 * text, then finds the most similar entities using cosine similarity.
 *
 * Returns an empty result set when semantic search is disabled.
 *
 * For large archives (>10k entities), consider replacing the brute-force
 * approach with sqlite-vss or a dedicated vector index.
 */
export async function semanticSearch(
  db: Database.Database,
  options: SemanticSearchOptions
): Promise<SemanticSearchResponse> {
  const emptyResponse: SemanticSearchResponse = {
    results: [],
    enabled: SEMANTIC_SEARCH_ENABLED,
    model: null,
  };

  if (!SEMANTIC_SEARCH_ENABLED) {
    return emptyResponse;
  }

  const { query, type, visibility, limit = 10, threshold = 0.3 } = options;

  const queryEmbedding = await computeEmbedding(query);
  if (!queryEmbedding) {
    return emptyResponse;
  }

  // Build filter conditions for the entity join
  const conditions: string[] = [];
  const params: any[] = [];

  if (type) {
    conditions.push('e.type = ?');
    params.push(type);
  }

  if (visibility) {
    conditions.push('e.visibility = ?');
    params.push(visibility);
  }

  const whereClause = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

  // Fetch all embeddings (brute-force approach for small archives)
  const rows = db.prepare(`
    SELECT emb.entity_id, emb.vector,
           e.type, e.title_en, e.title_zh
    FROM embeddings emb
    JOIN entities e ON emb.entity_id = e.id
    WHERE 1=1 ${whereClause}
  `).all(...params) as Array<{
    entity_id: string;
    vector: Buffer;
    type: string;
    title_en: string;
    title_zh: string;
  }>;

  // Compute cosine similarity for each candidate
  const queryVec = new Float32Array(queryEmbedding);
  const scored: SemanticSearchResult[] = [];

  for (const row of rows) {
    const storedVec = bufferToFloat32Array(row.vector);
    const similarity = cosineSimilarity(queryVec, storedVec);

    if (similarity >= threshold) {
      scored.push({
        id: row.entity_id,
        type: row.type,
        title_en: row.title_en,
        title_zh: row.title_zh,
        similarity: Math.round(similarity * 1000) / 1000,
      });
    }
  }

  // Sort by similarity descending and take top N
  scored.sort((a, b) => b.similarity - a.similarity);
  const results = scored.slice(0, limit);

  return {
    results,
    enabled: true,
    model: 'all-MiniLM-L6-v2',
  };
}

/**
 * Hybrid search: combines FTS5 keyword results with semantic similarity
 * results using reciprocal rank fusion (RRF). Returns a merged, deduplicated
 * result list.
 *
 * Falls back to FTS-only results when semantic search is disabled.
 */
export async function hybridSearch(
  db: Database.Database,
  query: string,
  ftsResults: Array<{ id: string; rank: number }>,
  options: SemanticSearchOptions
): Promise<Array<{ id: string; score: number; source: 'fts' | 'semantic' | 'both' }>> {
  const k = 60; // RRF constant

  // Build FTS rank map
  const ftsRankMap = new Map<string, number>();
  ftsResults.forEach((r, i) => {
    ftsRankMap.set(r.id, 1 / (k + i + 1));
  });

  if (!SEMANTIC_SEARCH_ENABLED) {
    return ftsResults.map((r, i) => ({
      id: r.id,
      score: 1 / (k + i + 1),
      source: 'fts' as const,
    }));
  }

  // Get semantic results
  const semanticResponse = await semanticSearch(db, options);
  const semanticRankMap = new Map<string, number>();
  semanticResponse.results.forEach((r, i) => {
    semanticRankMap.set(r.id, 1 / (k + i + 1));
  });

  // Merge with RRF
  const allIds = new Set([...ftsRankMap.keys(), ...semanticRankMap.keys()]);
  const merged: Array<{ id: string; score: number; source: 'fts' | 'semantic' | 'both' }> = [];

  for (const id of allIds) {
    const ftsScore = ftsRankMap.get(id) || 0;
    const semScore = semanticRankMap.get(id) || 0;
    const source: 'fts' | 'semantic' | 'both' =
      ftsScore > 0 && semScore > 0 ? 'both' : ftsScore > 0 ? 'fts' : 'semantic';

    merged.push({
      id,
      score: ftsScore + semScore,
      source,
    });
  }

  merged.sort((a, b) => b.score - a.score);
  return merged;
}

// ─── Vector Math Helpers ────────────────────────────────────────────────────

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

function float32ArrayToBuffer(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
}

function bufferToFloat32Array(buf: Buffer): Float32Array {
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Float32Array(arrayBuffer);
}

// ─── Status ─────────────────────────────────────────────────────────────────

/**
 * Returns the current status of the semantic search subsystem.
 * Useful for admin dashboards and health checks.
 */
export function getSemanticSearchStatus(db: Database.Database): {
  enabled: boolean;
  model: string | null;
  indexedCount: number;
  dimensions: number;
} {
  if (!SEMANTIC_SEARCH_ENABLED) {
    return {
      enabled: false,
      model: null,
      indexedCount: 0,
      dimensions: EMBEDDING_DIMENSIONS,
    };
  }

  let indexedCount = 0;
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM embeddings').get() as { count: number };
    indexedCount = row.count;
  } catch {
    // embeddings table may not exist yet
  }

  return {
    enabled: true,
    model: 'all-MiniLM-L6-v2',
    indexedCount,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}
