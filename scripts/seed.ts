/**
 * Seed script: run migrations and set default admin password.
 * Usage: npm run db:seed
 */
import { runMigrations } from '../src/lib/db/migrations/index';
import { hashPassword, setPasswordHash } from '../src/lib/auth/index';

runMigrations();

const hash = hashPassword('abc123');
setPasswordHash(hash);

console.log('Database seeded. Default admin password: abc123');
