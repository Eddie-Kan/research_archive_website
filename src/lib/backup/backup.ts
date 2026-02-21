import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exportPortableArchive } from '../export/archive';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAILY = parseInt(process.env.BACKUP_RETENTION_DAILY || '30');
const RETENTION_MONTHLY = parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12');

export interface BackupResult {
  path: string;
  size: number;
  checksum: string;
  timestamp: string;
  type: 'daily' | 'monthly' | 'manual';
}

export async function createBackup(type: 'daily' | 'monthly' | 'manual' = 'manual'): Promise<BackupResult> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${type}-${timestamp}.zip`;
  const outputPath = path.join(BACKUP_DIR, filename);

  const result = await exportPortableArchive({
    outputPath,
    includeMedia: true,
    includeDb: true,
  });

  // Clean up old backups based on retention policy
  await enforceRetention();

  return {
    ...result,
    timestamp: new Date().toISOString(),
    type,
  };
}

export async function enforceRetention(): Promise<{ deleted: string[] }> {
  const deleted: string[] = [];
  if (!fs.existsSync(BACKUP_DIR)) return { deleted };

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
    .sort()
    .reverse();

  const dailyFiles = files.filter(f => f.includes('-daily-'));
  const monthlyFiles = files.filter(f => f.includes('-monthly-'));

  // Keep only RETENTION_DAILY daily backups
  for (const file of dailyFiles.slice(RETENTION_DAILY)) {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
    const checksumFile = path.join(BACKUP_DIR, file + '.sha256');
    if (fs.existsSync(checksumFile)) fs.unlinkSync(checksumFile);
    deleted.push(file);
  }

  // Keep only RETENTION_MONTHLY monthly backups
  for (const file of monthlyFiles.slice(RETENTION_MONTHLY)) {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
    const checksumFile = path.join(BACKUP_DIR, file + '.sha256');
    if (fs.existsSync(checksumFile)) fs.unlinkSync(checksumFile);
    deleted.push(file);
  }

  return { deleted };
}

export async function verifyBackup(backupPath: string): Promise<{ valid: boolean; error?: string }> {
  if (!fs.existsSync(backupPath)) {
    return { valid: false, error: 'Backup file not found' };
  }

  // Verify checksum
  const checksumFile = backupPath + '.sha256';
  if (!fs.existsSync(checksumFile)) {
    return { valid: false, error: 'Checksum file missing' };
  }

  const expectedChecksum = fs.readFileSync(checksumFile, 'utf-8').trim();
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(backupPath));
  const actualChecksum = hash.digest('hex');

  if (actualChecksum !== expectedChecksum) {
    return { valid: false, error: 'Checksum mismatch — file may be corrupted' };
  }

  // Verify zip is readable and contains manifest
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(backupPath);
    const manifest = zip.getEntry('manifest.json');
    if (!manifest) {
      return { valid: false, error: 'Missing manifest.json in archive' };
    }
  } catch {
    return { valid: false, error: 'Archive is not a valid zip file' };
  }

  return { valid: true };
}

export function listBackups(): BackupResult[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
    .map(f => {
      const filePath = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(filePath);
      const checksumFile = filePath + '.sha256';
      const checksum = fs.existsSync(checksumFile) ? fs.readFileSync(checksumFile, 'utf-8').trim() : '';

      // Parse type from filename
      const typeMatch = f.match(/backup-(daily|monthly|manual)-/);
      const type = (typeMatch?.[1] || 'manual') as BackupResult['type'];

      return {
        path: filePath,
        size: stats.size,
        checksum,
        timestamp: stats.mtime.toISOString(),
        type,
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
