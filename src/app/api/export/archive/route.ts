import { NextRequest, NextResponse } from 'next/server';
import { exportPortableArchive } from '@/lib/export/archive';
import { requireAdminSession } from '@/lib/auth/session';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(process.env.BACKUP_DIR || './backups', `export-${timestamp}.zip`);

    const result = await exportPortableArchive({
      outputPath,
      includeMedia: true,
      includeDb: true,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — create archive and stream it as a download
export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(process.env.BACKUP_DIR || './backups', `export-${timestamp}.zip`);

    await exportPortableArchive({
      outputPath,
      includeMedia: true,
      includeDb: true,
    });

    const fileBuffer = fs.readFileSync(outputPath);
    // Clean up temp file after reading
    fs.unlinkSync(outputPath);
    const checksumFile = outputPath + '.sha256';
    if (fs.existsSync(checksumFile)) fs.unlinkSync(checksumFile);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="ek-archive-${timestamp}.zip"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
