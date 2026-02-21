import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import crypto from 'crypto';

export interface ArchiveExportOptions {
  outputPath: string;
  includeMedia: boolean;
  includeDb: boolean;
}

export async function exportPortableArchive(options: ArchiveExportOptions): Promise<{ path: string; size: number; checksum: string }> {
  const { outputPath, includeMedia, includeDb } = options;
  const contentDir = process.env.CONTENT_REPO_PATH || './content-repo';

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      // Compute checksum of the archive
      const hash = crypto.createHash('sha256');
      const fileBuffer = fs.readFileSync(outputPath);
      hash.update(fileBuffer);
      const checksum = hash.digest('hex');

      // Write checksum file
      fs.writeFileSync(outputPath + '.sha256', checksum);

      resolve({ path: outputPath, size: archive.pointer(), checksum });
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add manifest
    const manifest = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      format: 'ek-research-archive',
      includes: { entities: true, docs: true, media: includeMedia, db: includeDb },
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Add entity JSON files (excluding edges.json which is added separately at root)
    const entitiesDir = path.join(contentDir, 'entities');
    if (fs.existsSync(entitiesDir)) {
      archive.glob('**/*', { cwd: entitiesDir, ignore: ['edges.json'] }, { prefix: 'entities' });
    }

    // Add MDX docs
    const docsDir = path.join(contentDir, 'docs');
    if (fs.existsSync(docsDir)) {
      archive.directory(docsDir, 'docs');
    }

    // Add media
    if (includeMedia) {
      const mediaDir = path.join(contentDir, 'media');
      if (fs.existsSync(mediaDir)) {
        archive.directory(mediaDir, 'media');
      }
    }

    // Add SQLite DB snapshot
    if (includeDb) {
      const dbPath = (process.env.DATABASE_URL || 'file:./data/archive.db').replace('file:', '');
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'db/archive.db' });
      }
    }

    // Add edges file if it exists at the top level of entities
    const edgesFile = path.join(entitiesDir, 'edges.json');
    if (fs.existsSync(edgesFile)) {
      archive.file(edgesFile, { name: 'edges.json' });
    }

    archive.finalize();
  });
}

// Import from a portable archive - restores content-repo files and re-indexes
export async function importPortableArchive(archivePath: string, targetDir: string): Promise<{ entities: number; docs: number; media: number }> {
  // Dynamic import of adm-zip for extraction
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip(archivePath);
  const entries = zip.getEntries();

  fs.mkdirSync(targetDir, { recursive: true });

  let entityCount = 0;
  let docCount = 0;
  let mediaCount = 0;

  const resolvedTarget = path.resolve(targetDir);

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName;
    const destPath = path.resolve(targetDir, entryName);

    // Prevent path traversal: ensure destPath is inside targetDir
    if (!destPath.startsWith(resolvedTarget + path.sep) && destPath !== resolvedTarget) {
      continue;
    }

    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    // Write the file
    fs.writeFileSync(destPath, entry.getData());

    // Count by category
    if (entryName.startsWith('entities/')) {
      entityCount++;
    } else if (entryName.startsWith('docs/')) {
      docCount++;
    } else if (entryName.startsWith('media/')) {
      mediaCount++;
    }
  }

  return { entities: entityCount, docs: docCount, media: mediaCount };
}
