import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus, setJobStatus } from '@/lib/job-store';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = getJobStatus(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (job.status === 'processing') {
      return NextResponse.json({ status: 'processing', progress: job.progress, title: job.title, thumbnail: job.thumbnail, uploader: job.uploader, duration: job.duration, platform: job.platform, withAudio: job.withAudio, quality: job.quality });
    }
    if (job.status === 'failed') {
      return NextResponse.json({ status: 'failed', error: job.error, title: job.title, thumbnail: job.thumbnail, platform: job.platform, withAudio: job.withAudio, quality: job.quality });
    }
    return NextResponse.json({ status: 'completed', jobId: id, platform: job.platform, withAudio: job.withAudio, quality: job.quality, title: job.title, thumbnail: job.thumbnail, uploader: job.uploader, duration: job.duration, fileName: job.fileName, fileSize: job.fileSize, fileUrl: job.fileUrl });
  } catch (e) {
    console.error('Status error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
