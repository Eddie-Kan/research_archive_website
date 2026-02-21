/**
 * CLI script to set the admin password.
 * Usage: npm run admin:set-password <password>
 */
import { runMigrations } from '../src/lib/db/migrations/index';
import { hashPassword, setPasswordHash } from '../src/lib/auth/index';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run admin:set-password <password>');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters');
  process.exit(1);
}

// Ensure migrations are up to date
runMigrations();

const hash = hashPassword(password);
setPasswordHash(hash);

console.log('Admin password set successfully.');
