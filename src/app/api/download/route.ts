import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { downloads } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getMetadata, downloadVideo } from '@/lib/ytdlp';

export const maxDuration = 300;

const PLATFORM_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'youtube-shorts', regex: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/i },
  { name: 'youtube', regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/.+/i },
  { name: 'instagram-reels', regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reels?\/[\w-]+/i },
  { name: 'instagram-post', regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/[\w-]+/i },
  { name: 'tiktok', regex: /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/.+/i },
];

function detectPlatform(url: string): string | null {
  const match = PLATFORM_PATTERNS.find((p) => p.regex.test(url));
  return match ? match.name : null;
}

// Runs the actual download in the background and updates the DB row.
async function runJob(jobId: string, url: string, withAudio: boolean, quality: string) {
  try {
    // Fetch metadata first (best-effort)
    try {
      const meta = await getMetadata(url);
      await db
        .update(downloads)
        .set({
          title: meta.title,
          thumbnail: meta.thumbnail,
          uploader: meta.uploader,
          duration: meta.duration ?? null,
        })
        .where(eq(downloads.jobId, jobId));
    } catch {
      // metadata failure is non-fatal
    }

    let lastWritten = 0;
    const outcome = await downloadVideo({
      url,
      withAudio,
      quality,
      jobId,
      onProgress: (percent) => {
        // Throttle DB writes to whole-number jumps of >= 5%
        const rounded = Math.floor(percent);
        if (rounded - lastWritten >= 5) {
          lastWritten = rounded;
          db.update(downloads)
            .set({ progress: rounded })
            .where(eq(downloads.jobId, jobId))
            .catch(() => {});
        }
      },
    });

    await db
      .update(downloads)
      .set({
        status: 'completed',
        progress: 100,
        fileName: outcome.fileName,
        fileSize: outcome.fileSize,
        completedAt: new Date(),
      })
      .where(eq(downloads.jobId, jobId));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db
      .update(downloads)
      .set({ status: 'failed', errorMessage: message.slice(0, 500) })
      .where(eq(downloads.jobId, jobId))
      .catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, withAudio, quality } = body as {
      url?: string;
      withAudio?: boolean;
      quality?: string;
    };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid URL' }, { status: 400 });
    }

    const platform = detectPlatform(url.trim());
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported link. Use a YouTube, Instagram, or TikTok URL.' },
        { status: 400 }
      );
    }

    const jobId = randomUUID();
    const audio = withAudio !== false;
    const q = quality || '1080p';

    await db.insert(downloads).values({
      jobId,
      url: url.trim(),
      platform,
      withAudio: audio,
      quality: q,
      status: 'processing',
      progress: 0,
    });

    // Kick off the download without blocking the response.
    runJob(jobId, url.trim(), audio, q);

    return NextResponse.json({
      success: true,
      jobId,
      platform,
      withAudio: audio,
      quality: q,
      status: 'processing',
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
