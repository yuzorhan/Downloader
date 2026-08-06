import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { bootstrap, getMetadata, downloadVideo, DOWNLOAD_DIR } from '@/lib/ytdlp';
import { setJobStatus, getJobStatus } from '@/lib/job-store';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300;

const PLATFORM_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'youtube-shorts', regex: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/i },
  { name: 'youtube', regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|ytu\.be)\/.+/i },
  { name: 'instagram-reels', regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reels?\/[\w-]+/i },
  { name: 'instagram-post', regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/[\w-]+/i },
  { name: 'tiktok', regex: /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/.+/i },
];

function detectPlatform(url: string): string | null {
  return PLATFORM_PATTERNS.find(p => p.regex.test(url))?.name ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = String(body?.url || '').trim();
    const withAudio = body?.withAudio !== false;
    const quality = String(body?.quality || '1080p');

    if (!url) return NextResponse.json({ error: 'Please provide a valid URL' }, { status: 400 });

    const platform = detectPlatform(url);
    if (!platform) return NextResponse.json({ error: 'Unsupported link' }, { status: 400 });

    const jobId = randomUUID();
    setJobStatus(jobId, { status: 'processing', progress: 0, platform, withAudio, quality });

    // Background download (non-blocking)
    (async () => {
      try {
        await bootstrap();
        // Metadata best-effort
        try {
          const meta = await getMetadata(url);
          setJobStatus(jobId, { title: meta.title, thumbnail: meta.thumbnail, uploader: meta.uploader, duration: meta.duration ?? null, progress: 10 });
        } catch {
          setJobStatus(jobId, { progress: 10 });
        }

        let lastProgress = 10;
        const outcome = await downloadVideo({
          url,
          withAudio,
          quality,
          jobId,
          onProgress: (percent) => {
            const rounded = Math.floor(percent);
            if (rounded - lastProgress >= 5) {
              lastProgress = rounded;
              setJobStatus(jobId, { progress: Math.min(95, rounded) });
            }
          },
        });

        setJobStatus(jobId, {
          status: 'completed',
          progress: 100,
          fileName: outcome.fileName,
          fileSize: outcome.fileSize,
          fileUrl: `/api/download/${jobId}/file`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Download failed';
        setJobStatus(jobId, { status: 'failed', error: msg.slice(0, 500) });
      }
    })();

    return NextResponse.json({ success: true, jobId, platform, withAudio, quality, status: 'processing' });
  } catch (e) {
    console.error('Download error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
