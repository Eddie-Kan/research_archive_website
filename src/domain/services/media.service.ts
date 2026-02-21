import { getDb } from '@/lib/db/index';
import { getStorageProvider, type StorageProvider } from '@/lib/db/storage-abstraction';
import crypto from 'crypto';

// ─── DB row shape ────────────────────────────────────────────────────────────

interface MediaRow {
  id: string;
  entity_id: string | null;
  media_type: string | null;
  source_path: string | null;
  checksum: string | null;
  size_bytes: number | null;
  preview_path: string | null;
  provenance_entity_id: string | null;
  created_at: string;
}

// ─── MediaService ────────────────────────────────────────────────────────────

export class MediaService {
  private storage: StorageProvider;

  constructor() {
    this.storage = getStorageProvider();
  }

  /** Fetch a single media record by ID. */
  getById(id: string): MediaRow | null {
    const db = getDb();
    return (
      (db
        .prepare('SELECT * FROM media WHERE id = @id')
        .get({ id }) as MediaRow | undefined) ?? null
    );
  }

  /** List all media records attached to a given entity. */
  listForEntity(entityId: string): MediaRow[] {
    const db = getDb();
    return db
      .prepare('SELECT * FROM media WHERE entity_id = @eid ORDER BY created_at DESC')
      .all({ eid: entityId }) as MediaRow[];
  }

  /**
   * Resolve a storage-relative source_path to a URL the client can use.
   * In local mode this returns a `/media/...` path served by Next.js.
   */
  getMediaUrl(sourcePath: string): string {
    return this.storage.getUrl(sourcePath);
  }

  /**
   * Walk every media row that has a checksum and verify the file on disk
   * still matches. Returns a summary with any mismatches or missing files.
   */
  async verifyIntegrity(): Promise<{
    total: number;
    valid: number;
    invalid: string[];
  }> {
    const db = getDb();
    const items = db
      .prepare('SELECT * FROM media WHERE checksum IS NOT NULL')
      .all() as MediaRow[];

    const invalid: string[] = [];

    for (const item of items) {
      if (!item.source_path) {
        invalid.push(`${item.id}: source_path is null`);
        continue;
      }

      try {
        const exists = await this.storage.exists(item.source_path);
        if (!exists) {
          invalid.push(`${item.id}: file not found at ${item.source_path}`);
          continue;
        }

        const data = await this.storage.readFile(item.source_path);
        const actual = crypto
          .createHash('sha256')
          .update(data)
          .digest('hex');

        if (actual !== item.checksum) {
          invalid.push(
            `${item.id}: checksum mismatch (expected ${item.checksum}, got ${actual})`
          );
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);
        invalid.push(`${item.id}: ${message}`);
      }
    }

    return {
      total: items.length,
      valid: items.length - invalid.length,
      invalid,
    };
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _service: MediaService | null = null;

export function getMediaService(): MediaService {
  if (!_service) _service = new MediaService();
  return _service;
}
