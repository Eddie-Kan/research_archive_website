import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Entity, Edge } from './types.js';
import { entitySchema, edgeSchema } from './schemas.js';

// ─── Validation Results ──────────────────────────────────────────────────────

export interface ValidationResult<T> {
  success: boolean;
  entity?: T;
  errors?: string[];
}

// ─── Entity Validation ──────────────────────────────────────────────────────

export function validateEntity(data: unknown): ValidationResult<Entity> {
  const result = entitySchema.safeParse(data);
  if (result.success) {
    return { success: true, entity: result.data as Entity };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `[${path}] ${issue.message}`;
  });
  return { success: false, errors };
}

// ─── Edge Validation ─────────────────────────────────────────────────────────

export function validateEdge(data: unknown): ValidationResult<Edge> {
  const result = edgeSchema.safeParse(data);
  if (result.success) {
    return { success: true, entity: result.data as Edge };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `[${path}] ${issue.message}`;
  });
  return { success: false, errors };
}

// ─── Bulk Validation ─────────────────────────────────────────────────────────

interface BulkValidationReport {
  total: number;
  valid: number;
  invalid: number;
  errors: Array<{ file: string; errors: string[] }>;
}

function collectJsonFiles(dir: string): string[] {
  const files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (entry.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function validateAll(contentDir: string): BulkValidationReport {
  const entitiesDir = join(resolve(contentDir), 'entities');
  const jsonFiles = collectJsonFiles(entitiesDir);

  const report: BulkValidationReport = {
    total: 0,
    valid: 0,
    invalid: 0,
    errors: [],
  };

  for (const file of jsonFiles) {
    report.total++;
    let data: unknown;
    try {
      const raw = readFileSync(file, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      report.invalid++;
      const message = err instanceof Error ? err.message : String(err);
      report.errors.push({ file, errors: [`Failed to parse JSON: ${message}`] });
      continue;
    }

    // Handle arrays (e.g. edges.json contains an array of edges)
    if (Array.isArray(data)) {
      const fileErrors: string[] = [];
      for (let i = 0; i < data.length; i++) {
        const result = validateEdge(data[i]);
        if (!result.success) {
          for (const err of result.errors!) {
            fileErrors.push(`[${i}] ${err}`);
          }
        }
      }
      if (fileErrors.length > 0) {
        report.invalid++;
        report.errors.push({ file, errors: fileErrors });
      } else {
        report.valid++;
      }
    } else {
      // Determine if this is an edge file or entity file based on presence of edge_type
      const obj = data as Record<string, unknown>;
      if (typeof obj.edge_type === 'string' || typeof obj.from_id === 'string') {
        const result = validateEdge(data);
        if (result.success) {
          report.valid++;
        } else {
          report.invalid++;
          report.errors.push({ file, errors: result.errors! });
        }
      } else {
        const result = validateEntity(data);
        if (result.success) {
          report.valid++;
        } else {
          report.invalid++;
          report.errors.push({ file, errors: result.errors! });
        }
      }
    }
  }

  return report;
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

function main() {
  const contentDir = process.argv[2] || './content-repo';
  console.log(`Validating all entities in: ${resolve(contentDir)}/entities/\n`);

  const report = validateAll(contentDir);

  console.log(`Total files:   ${report.total}`);
  console.log(`Valid:         ${report.valid}`);
  console.log(`Invalid:       ${report.invalid}`);

  if (report.errors.length > 0) {
    console.log('\n--- Validation Errors ---\n');
    for (const entry of report.errors) {
      console.log(`File: ${entry.file}`);
      for (const err of entry.errors) {
        console.log(`  - ${err}`);
      }
      console.log();
    }
    process.exit(1);
  } else {
    if (report.total === 0) {
      console.log('\nNo JSON files found to validate.');
    } else {
      console.log('\nAll entities are valid.');
    }
    process.exit(0);
  }
}

// Run when executed directly
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('validate.ts') || process.argv[1].endsWith('validate.js'));

if (isMain) {
  main();
}
