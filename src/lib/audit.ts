import { getDb } from './db/index';

export function auditLog(action: string, opts: { entityId?: string; entityType?: string; ip?: string; detail?: string } = {}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_log (action, entity_id, entity_type, ip, detail) VALUES (?, ?, ?, ?, ?)`
  ).run(action, opts.entityId ?? null, opts.entityType ?? null, opts.ip ?? null, opts.detail ?? null);
}
