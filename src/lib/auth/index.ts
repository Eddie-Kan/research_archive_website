import crypto from 'crypto';
import { getDb } from '../db/index';

const SCRYPT_KEYLEN = 64;
const SALT_LEN = 16;

// ─── Password Hashing ──────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

// ─── Admin Settings (password hash storage) ────────────────────────────────

export function getPasswordHash(): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get('password_hash') as { value: string } | undefined;
  if (row) return row.value;

  // Fallback: env var for initial bootstrap
  return process.env.OWNER_PASSWORD_HASH || null;
}

export function setPasswordHash(hash: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES ('password_hash', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(hash);
}

export function isSetupRequired(): boolean {
  return getPasswordHash() === null;
}

// ─── Session Management ────────────────────────────────────────────────────

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_MS);

  db.prepare(`
    INSERT INTO admin_sessions (token, created_at, expires_at)
    VALUES (?, ?, ?)
  `).run(token, now.toISOString(), expires.toISOString());

  // Clean up expired sessions opportunistically
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now.toISOString());

  return token;
}

export function validateSession(token: string): boolean {
  const db = getDb();
  const row = db.prepare(
    'SELECT token FROM admin_sessions WHERE token = ? AND expires_at > ?'
  ).get(token, new Date().toISOString()) as { token: string } | undefined;
  return !!row;
}

export function destroySession(token: string): void {
  const db = getDb();
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

export function destroyAllSessions(exceptToken?: string): void {
  const db = getDb();
  if (exceptToken) {
    db.prepare('DELETE FROM admin_sessions WHERE token != ?').run(exceptToken);
  } else {
    db.prepare('DELETE FROM admin_sessions').run();
  }
}
