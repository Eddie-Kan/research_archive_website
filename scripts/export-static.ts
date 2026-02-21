import { runMigrations } from '../src/lib/db/migrations/index';
import { generateStaticSnapshot } from '../src/lib/export/static';

async function main() {
  const locale = (process.argv[2] || 'en') as 'en' | 'zh-Hans';
  const outputDir = process.argv[3] || `./out/static-${locale}`;
  const viewId = process.argv[4];

  console.log('Ensuring database schema...');
  runMigrations();

  console.log(`Generating static snapshot...`);
  console.log(`  Locale: ${locale}`);
  console.log(`  Output: ${outputDir}`);
  if (viewId) console.log(`  View: ${viewId}`);

  const result = await generateStaticSnapshot({
    outputDir,
    locale,
    viewId,
    includeMedia: true,
  });

  console.log(`\nExport complete:`);
  console.log(`  Files: ${result.files}`);
  console.log(`  Size: ${(result.size / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Static export failed:', err);
  process.exit(1);
});
