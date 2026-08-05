import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { downloads } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Poll download job status by jobId (UUID).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [record] = await db.select().from(downloads).where(eq(downloads.jobId, id)).limit(1);

    if (!record) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (record.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: record.errorMessage || 'Download failed',
        title: record.title,
        thumbnail: record.thumbnail,
      });
    }

    if (record.status === 'processing') {
      return NextResponse.json({
        status: 'processing',
        progress: record.progress,
        title: record.title,
        thumbnail: record.thumbnail,
        uploader: record.uploader,
        duration: record.duration,
      });
    }

    // completed
    return NextResponse.json({
      status: 'completed',
      jobId: record.jobId,
      platform: record.platform,
      withAudio: record.withAudio,
      quality: record.quality,
      title: record.title,
      thumbnail: record.thumbnail,
      uploader: record.uploader,
      duration: record.duration,
      fileName: record.fileName,
      fileSize: record.fileSize,
      fileUrl: `/api/download/${record.jobId}/file`,
    });
  } catch (err) {
    console.error('Status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
