#!/usr/bin/env tsx
/**
 * Static i18n consistency check.
 * Compares key sets between all locale dictionaries and fails if mismatched.
 * Usage: npx tsx scripts/i18n-check.ts   (or: npm run i18n:check)
 */

import fs from 'node:fs';
import path from 'node:path';

const DICT_DIR = path.resolve(import.meta.dirname, '../src/lib/i18n/dictionaries');

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

function loadJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const files = fs.readdirSync(DICT_DIR).filter(f => f.endsWith('.json'));
if (files.length < 2) {
  console.error('Need at least 2 locale files to compare.');
  process.exit(1);
}

const locales = files.map(f => ({
  name: f.replace('.json', ''),
  keys: new Set(collectKeys(loadJson(path.join(DICT_DIR, f)))),
}));

const reference = locales[0];
let hasErrors = false;

for (let i = 1; i < locales.length; i++) {
  const other = locales[i];

  const missingInOther = [...reference.keys].filter(k => !other.keys.has(k));
  const extraInOther = [...other.keys].filter(k => !reference.keys.has(k));

  if (missingInOther.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Keys in "${reference.name}" but missing in "${other.name}":`);
    missingInOther.forEach(k => console.error(`   - ${k}`));
  }

  if (extraInOther.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Keys in "${other.name}" but missing in "${reference.name}":`);
    extraInOther.forEach(k => console.error(`   - ${k}`));
  }

  if (missingInOther.length === 0 && extraInOther.length === 0) {
    console.log(`✅ "${reference.name}" and "${other.name}" have identical key sets (${reference.keys.size} keys)`);
  }
}

if (hasErrors) {
  console.error('\ni18n check failed — locale files have mismatched keys.');
  process.exit(1);
} else {
  console.log('\ni18n check passed.');
}
