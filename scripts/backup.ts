import { createBackup } from '../src/lib/backup/backup';

async function main() {
  const type = (process.argv[2] || 'manual') as 'daily' | 'monthly' | 'manual';
  console.log(`Creating ${type} backup...`);
  const result = await createBackup(type);
  console.log(`Backup created: ${result.path}`);
  console.log(`Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Checksum: ${result.checksum}`);
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
