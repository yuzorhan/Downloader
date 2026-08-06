import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DOWNLOAD_DIR } from '@/lib/ytdlp';
import { getJobStatus } from '@/lib/job-store';

export const maxDuration = 300;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = getJobStatus(id);
    if (!job || job.status !== 'completed' || !job.fileName) {
      return NextResponse.json({ error: 'File not ready' }, { status: 404 });
    }
    const filePath = path.join(DOWNLOAD_DIR, job.fileName);
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const stat = fs.statSync(filePath);
    const ext = path.extname(job.fileName) || '.mp4';
    const baseTitle = (job.title || `clip-${id.slice(0,8)}`).replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    const downloadName = `${baseTitle}${ext}`;

    const stream = fs.createReadStream(filePath);
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': ext === '.mp4' ? 'video/mp4' : 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('File serve error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
