import { runMigrations } from '../src/lib/db/migrations/index';
import { runFullIngestion } from '../src/lib/ingestion/pipeline';

async function main() {
  console.log('Ensuring database schema...');
  runMigrations();

  console.log('Running content ingestion...');
  const result = await runFullIngestion();

  console.log(`\nIngestion complete:`);
  console.log(`  Entities: ${result.entities.valid} valid, ${result.entities.invalid} invalid (${result.entities.total} total)`);
  console.log(`  Edges: ${result.edges.valid} valid, ${result.edges.invalid} invalid (${result.edges.total} total)`);
  console.log(`  Duration: ${result.duration_ms}ms`);

  if (result.issues.length > 0) {
    console.log(`\nIssues (${result.issues.length}):`);
    for (const issue of result.issues) {
      console.log(`  - ${issue}`);
    }
  }
}

main().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
