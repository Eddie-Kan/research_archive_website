import { createBackup, enforceRetention } from '../src/lib/backup/backup';

/**
 * Automatic backup scheduler — designed to be called by system cron.
 *
 * Usage:
 *   npx tsx scripts/backup-scheduled.ts
 *
 * Crontab example (daily at 2am, monthly on 1st at 3am):
 *   0 2 * * * cd /path/to/project && npx tsx scripts/backup-scheduled.ts
 *
 * Logic:
 *   - On the 1st of each month → creates a "monthly" backup
 *   - Otherwise → creates a "daily" backup
 *   - Always enforces retention policy after creation
 */
async function main() {
  const day = new Date().getDate();
  const type = day === 1 ? 'monthly' : 'daily';

  console.log(`[backup-scheduled] Creating ${type} backup...`);
  const result = await createBackup(type as 'daily' | 'monthly');
  console.log(`[backup-scheduled] Created: ${result.path} (${(result.size / 1024 / 1024).toFixed(1)} MB)`);

  const { deleted } = await enforceRetention();
  if (deleted.length > 0) {
    console.log(`[backup-scheduled] Cleaned up ${deleted.length} old backup(s)`);
  }
}

main().catch(err => {
  console.error('[backup-scheduled] Failed:', err);
  process.exit(1);
});
