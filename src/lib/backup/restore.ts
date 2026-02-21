import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { closeDb, getDb } from '../db/index';
import { runMigrations } from '../db/migrations/index';
import { importPortableArchive } from '../export/archive';

export interface RestoreOptions {
  backupPath: string;
  targetContentDir?: string;
  verifyChecksum?: boolean;
}

export interface RestoreResult {
  success: boolean;
  checksumValid?: boolean;
  entitiesRestored: number;
  errors: string[];
}

export async function restoreFromBackup(options: RestoreOptions): Promise<RestoreResult> {
  const { backupPath, targetContentDir, verifyChecksum = true } = options;
  const contentDir = targetContentDir || process.env.CONTENT_REPO_PATH || './content-repo';
  const errors: string[] = [];

  // Verify file exists
  if (!fs.existsSync(backupPath)) {
    return { success: false, entitiesRestored: 0, errors: ['Backup file not found'] };
  }

  // Verify checksum if requested
  let checksumValid: boolean | undefined;
  if (verifyChecksum) {
    const checksumFile = backupPath + '.sha256';
    if (fs.existsSync(checksumFile)) {
      const expectedChecksum = fs.readFileSync(checksumFile, 'utf-8').trim();
      const actualChecksum = crypto.createHash('sha256')
        .update(fs.readFileSync(backupPath))
        .digest('hex');
      checksumValid = expectedChecksum === actualChecksum;
      if (!checksumValid) {
        return { success: false, checksumValid, entitiesRestored: 0, errors: ['Checksum mismatch - backup may be corrupted'] };
      }
    } else {
      errors.push('No checksum file found - skipping verification');
    }
  }

  // Close existing DB connection before restoring
  closeDb();

  try {
    // Create backup of current DB state before restoring
    const dbPath = (process.env.DATABASE_URL || 'file:./data/archive.db').replace('file:', '');
    if (fs.existsSync(dbPath)) {
      const backupOfCurrent = dbPath + '.pre-restore.' + Date.now();
      fs.copyFileSync(dbPath, backupOfCurrent);
    }

    // Extract archive contents to the content directory
    const result = await importPortableArchive(backupPath, contentDir);

    // If the archive contained a DB snapshot, copy it into place
    const extractedDb = path.join(contentDir, 'db', 'archive.db');
    if (fs.existsSync(extractedDb)) {
      const dbDir = path.dirname(dbPath);
      fs.mkdirSync(dbDir, { recursive: true });
      fs.copyFileSync(extractedDb, dbPath);
      // Clean up the extracted db directory from content dir
      fs.unlinkSync(extractedDb);
      const extractedDbDir = path.join(contentDir, 'db');
      if (fs.readdirSync(extractedDbDir).length === 0) {
        fs.rmdirSync(extractedDbDir);
      }
    }

    // Re-open DB connection and run any pending migrations
    getDb();
    try {
      runMigrations();
    } catch (migErr) {
      errors.push(`Migration warning: ${migErr instanceof Error ? migErr.message : String(migErr)}`);
    }

    return {
      success: true,
      checksumValid,
      entitiesRestored: result.entities,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      checksumValid,
      entitiesRestored: 0,
      errors: [...errors, err instanceof Error ? err.message : String(err)],
    };
  }
}
