import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { downloads } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DOWNLOAD_DIR } from '@/lib/ytdlp';

export const maxDuration = 300;

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
}

// Streams the finished file to the browser as an attachment.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [record] = await db.select().from(downloads).where(eq(downloads.jobId, id)).limit(1);

    if (!record || record.status !== 'completed' || !record.fileName) {
      return NextResponse.json({ error: 'File not ready' }, { status: 404 });
    }

    const filePath = path.join(DOWNLOAD_DIR, record.fileName);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File no longer available' }, { status: 410 });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(record.fileName) || '.mp4';
    const baseTitle = record.title ? sanitizeFilename(record.title) : `clipvault-${record.jobId.slice(0, 8)}`;
    const downloadName = `${baseTitle}${ext}`;

    const stream = fs.createReadStream(filePath);

    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': ext === '.mp4' ? 'video/mp4' : 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('File serve error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
