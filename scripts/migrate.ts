import { runMigrations } from '../src/lib/db/migrations/index';

console.log('Running database migrations...');
try {
  const applied = runMigrations();
  if (applied.length > 0) {
    console.log(`Applied ${applied.length} migration(s):`);
    for (const name of applied) {
      console.log(`  - ${name}`);
    }
  } else {
    console.log('Database is already up to date.');
  }
  console.log('Migrations completed successfully.');
} catch (err: any) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
