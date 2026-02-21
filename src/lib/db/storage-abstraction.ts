import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Abstract interface for file storage.
 * Local implementation uses the filesystem; future cloud implementation
 * would use S3-compatible storage with the same contract.
 */
export interface StorageProvider {
  readFile(filePath: string): Promise<Buffer>;
  writeFile(filePath: string, data: Buffer): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  listFiles(prefix: string): Promise<string[]>;
  getUrl(filePath: string): string;
  exists(filePath: string): Promise<boolean>;
}

/**
 * Filesystem-backed storage provider for local-first operation.
 * All paths are resolved relative to the configured basePath.
 */
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  private resolve(filePath: string): string {
    const resolved = path.resolve(this.basePath, filePath);
    // Prevent path traversal outside basePath
    if (!resolved.startsWith(this.basePath)) {
      throw new Error(`Path traversal detected: ${filePath}`);
    }
    return resolved;
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(filePath));
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    const resolved = this.resolve(filePath);
    const dir = path.dirname(resolved);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(resolved, data);
  }

  async deleteFile(filePath: string): Promise<void> {
    const resolved = this.resolve(filePath);
    try {
      await fs.unlink(resolved);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // File already gone — treat as success
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const resolved = this.resolve(prefix);
    try {
      const entries = await fs.readdir(resolved, { withFileTypes: true, recursive: true });
      const files: string[] = [];
      for (const entry of entries) {
        if (entry.isFile()) {
          // Build relative path from basePath
          const parentPath = (entry as unknown as { parentPath?: string }).parentPath ?? resolved;
          const fullPath = path.join(parentPath, entry.name);
          files.push(path.relative(this.basePath, fullPath));
        }
      }
      return files;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  getUrl(filePath: string): string {
    // In local mode, return a file:// URL or a relative web path
    // depending on context. For Next.js, media is typically served from /media/
    return `/media/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * S3-backed storage provider for cloud deployment.
 * Uses the AWS SDK v3 S3Client. Configure via environment variables:
 *   S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_PREFIX (optional)
 */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(opts: { endpoint: string; bucket: string; region?: string; prefix?: string }) {
    this.bucket = opts.bucket;
    this.prefix = opts.prefix || '';
    this.client = new S3Client({
      endpoint: opts.endpoint,
      region: opts.region || 'us-east-1',
      forcePathStyle: true,
    });
  }

  private key(filePath: string): string {
    return this.prefix ? `${this.prefix}/${filePath}` : filePath;
  }

  async readFile(filePath: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key(filePath) }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: this.key(filePath), Body: data }));
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(filePath) }));
  }

  async listFiles(prefix: string): Promise<string[]> {
    const fullPrefix = this.prefix ? `${this.prefix}/${prefix}` : prefix;
    const files: string[] = [];
    let continuationToken: string | undefined;

    do {
      const res = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: fullPrefix,
        ContinuationToken: continuationToken,
      }));
      for (const obj of res.Contents || []) {
        if (obj.Key) {
          files.push(this.prefix ? obj.Key.slice(this.prefix.length + 1) : obj.Key);
        }
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    return files;
  }

  getUrl(filePath: string): string {
    return `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${this.bucket}/${this.key(filePath)}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(filePath) }));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Returns the appropriate StorageProvider based on runtime configuration.
 */
export function getStorageProvider(): StorageProvider {
  if (process.env.RUNTIME_MODE === 'cloud' && process.env.S3_ENDPOINT) {
    return new S3StorageProvider({
      endpoint: process.env.S3_ENDPOINT,
      bucket: process.env.S3_BUCKET || 'ek-media',
      region: process.env.S3_REGION,
      prefix: process.env.S3_PREFIX,
    });
  }

  const mediaPath = process.env.MEDIA_STORAGE_PATH || './content-repo/media';
  return new LocalStorageProvider(mediaPath);
}
