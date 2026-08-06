import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { bootstrap, getMetadata, downloadVideo, getFallbackMeta, isBotBlockedMessage } from '@/lib/ytdlp';
import { setJobStatus } from '@/lib/job-store';

export const maxDuration = 60;

const PLATFORM_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'youtube-shorts', regex: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/i },
  { name: 'youtube', regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/.+/i },
  { name: 'instagram-reels', regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reels?\/[\w-]+/i },
  { name: 'instagram-post', regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/[\w-]+/i },
  { name: 'tiktok', regex: /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/.+/i },
];

function detectPlatform(url: string): string | null {
  return PLATFORM_PATTERNS.find((p) => p.regex.test(url))?.name ?? null;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const body = await req.json();
    const url = String(body?.url || '').trim();
    const withAudio = body?.withAudio !== false;
    const quality = String(body?.quality || '720p');

    if (!url) return NextResponse.json({ error: 'Please paste a video link' }, { status: 400 });
    const platform = detectPlatform(url);
    if (!platform) return NextResponse.json({ error: 'Unsupported link. Use YouTube, Instagram or TikTok URL.' }, { status: 400 });

    const jobId = randomUUID();

    // 1) Try to get metadata + direct URL (fast path: no file download needed)
    try {
      // Quick bootstrap check with timeout
      await Promise.race([
        bootstrap(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('BOOTSTRAP_TIMEOUT')), 20000)),
      ]);

      const meta = await getMetadata(url, { quality, withAudio });

      // If we got a direct URL, return it immediately - browser can download directly (Vercel-safe, no server file)
      if (meta.directUrl) {
        // Also store for file endpoint fallback
        setJobStatus(jobId, {
          status: 'completed',
          progress: 100,
          platform,
          withAudio,
          quality,
          title: meta.title,
          thumbnail: meta.thumbnail,
          uploader: meta.uploader,
          duration: meta.duration,
          fileName: null,
          fileSize: null,
          fileUrl: meta.directUrl,
        });

        return NextResponse.json({
          success: true,
          jobId,
          platform,
          withAudio,
          quality,
          status: 'completed',
          title: meta.title,
          thumbnail: meta.thumbnail,
          uploader: meta.uploader,
          duration: meta.duration,
          fileUrl: meta.directUrl, // direct CDN URL
          fileName: `${(meta.title || 'video').replace(/[^\w.-]+/g, '_').slice(0, 80)}.${meta.ext || 'mp4'}`,
          isDirect: true,
          elapsedMs: Date.now() - started,
        });
      }

      // No direct URL found but metadata ok -> try full download as fallback (only if not bot blocked)
      // For Vercel hobby (10s) this may timeout, so we inform
      const isVercelHobby = process.env.VERCEL === '1' && !process.env.VERCEL_ENV; // rough
      // Try download synchronously with timeout 35s
      setJobStatus(jobId, {
        status: 'processing',
        progress: 15,
        platform,
        withAudio,
        quality,
        title: meta.title,
        thumbnail: meta.thumbnail,
        uploader: meta.uploader,
        duration: meta.duration,
      });

      const outcome = await downloadVideo({ url, withAudio, quality, jobId });
      setJobStatus(jobId, {
        status: 'completed',
        progress: 100,
        platform,
        withAudio,
        quality,
        title: meta.title,
        thumbnail: meta.thumbnail,
        uploader: meta.uploader,
        duration: meta.duration,
        fileName: outcome.fileName,
        fileSize: outcome.fileSize,
        fileUrl: `/api/download/${jobId}/file`,
      });

      return NextResponse.json({
        success: true,
        jobId,
        platform,
        withAudio,
        quality,
        status: 'completed',
        title: meta.title,
        thumbnail: meta.thumbnail,
        uploader: meta.uploader,
        duration: meta.duration,
        fileUrl: `/api/download/${jobId}/file`,
        fileName: outcome.fileName,
        fileSize: outcome.fileSize,
        isDirect: false,
        elapsedMs: Date.now() - started,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      const stderr = msg + ' ' + (err?.stderr || '');
      const isBot = isBotBlockedMessage(stderr);

      if (isBot || msg.includes('BOT_BLOCKED') || msg.includes('YTDLP_NOT_AVAILABLE')) {
        // Try fallback metadata via noembed/oembed
        let fallback: any = {};
        try {
          fallback = await getFallbackMeta(url);
        } catch {}
        const isYt = platform.includes('youtube');
        const title = fallback.title || (isYt ? 'YouTube video' : 'Video');
        return NextResponse.json(
          {
            error: isYt
              ? 'YouTube is blocking this server (common on Vercel). Try: 1) Use a TikTok/Instagram link (often works), 2) Self-host this app with Docker (gets your own IP), or 3) Add YouTube cookies via YTDLP_COOKIES env.'
              : 'This link is blocked or requires login. Try a public video, or self-host with cookies.',
            code: 'BOT_BLOCKED',
            jobId,
            platform,
            title: fallback.title || null,
            thumbnail: fallback.thumbnail || null,
            details: msg.slice(0, 600),
          },
          { status: 422 }
        );
      }

      // Other errors: timeout, etc.
      if (msg.includes('BOOTSTRAP_TIMEOUT') || msg.includes('timed out') || msg.includes('Timeout')) {
        return NextResponse.json(
          { error: 'Fetching video info timed out. The link may be invalid or the server is busy. Please try again.', code: 'TIMEOUT', details: msg.slice(0, 400) },
          { status: 504 }
        );
      }

      // Generic
      return NextResponse.json(
        { error: msg.slice(0, 600) || 'Failed to process video', code: 'DOWNLOAD_FAILED' },
        { status: 500 }
      );
    }
  } catch (e: any) {
    console.error('Download POST error', e);
    return NextResponse.json({ error: e?.message?.slice(0, 500) || 'Internal server error' }, { status: 500 });
  }
}
