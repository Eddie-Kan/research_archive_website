import { runMigrations } from '../src/lib/db/migrations/index';
import { exportPortableArchive } from '../src/lib/export/archive';

async function main() {
  const outputPath = process.argv[2] || `./out/archive-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
  const includeMedia = process.argv.includes('--no-media') ? false : true;
  const includeDb = process.argv.includes('--no-db') ? false : true;

  console.log('Ensuring database schema...');
  runMigrations();

  console.log(`Creating portable archive...`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  Include media: ${includeMedia}`);
  console.log(`  Include database: ${includeDb}`);

  const result = await exportPortableArchive({
    outputPath,
    includeMedia,
    includeDb,
  });

  console.log(`\nArchive created:`);
  console.log(`  Path: ${result.path}`);
  console.log(`  Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Checksum: ${result.checksum}`);
}

main().catch(err => {
  console.error('Archive export failed:', err);
  process.exit(1);
});
