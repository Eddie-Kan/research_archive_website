import { restoreFromBackup } from '../src/lib/backup/restore';

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error('Usage: tsx scripts/restore.ts <backup-path>');
    process.exit(1);
  }

  console.log(`Restoring from ${backupPath}...`);
  const result = await restoreFromBackup({ backupPath });

  if (result.success) {
    console.log(`Restore successful: ${result.entitiesRestored} entities restored`);
  } else {
    console.error('Restore failed:', result.errors.join('; '));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Restore failed:', err);
  process.exit(1);
});
