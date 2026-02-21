import { NextRequest, NextResponse } from 'next/server';
import { createBackup, listBackups, verifyBackup } from '@/lib/backup/backup';
import { restoreFromBackup } from '@/lib/backup/restore';
import { requireAdminSession } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const verify = request.nextUrl.searchParams.get('verify');
    const backups = listBackups();

    if (verify === '1') {
      const verified = await Promise.all(backups.map(async b => ({ ...b, ...(await verifyBackup(b.path)) })));
      return NextResponse.json(verified);
    }

    return NextResponse.json(backups);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const body = await request.json().catch(() => ({}));
    const type = (body.type || 'manual') as 'daily' | 'monthly' | 'manual';
    const result = await createBackup(type);

    // Verify immediately after creation
    const verification = await verifyBackup(result.path);
    return NextResponse.json({ ...result, ...verification });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT — restore from a backup
export async function PUT(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const { backupPath } = await request.json();
    if (!backupPath || typeof backupPath !== 'string') {
      return NextResponse.json({ error: 'backupPath required' }, { status: 400 });
    }

    const result = await restoreFromBackup({ backupPath });
    auditLog('backup.restore', { detail: backupPath });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
