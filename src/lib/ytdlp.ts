import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

export const DOWNLOAD_DIR = path.join(os.tmpdir(), 'clipvault-downloads');

let bootstrapPromise: Promise<{ ffmpegDir: string; ytdlpCmd: string[] }> | null = null;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function commandExists(cmd: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(cmd, args, { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

export async function bootstrap(): Promise<{ ffmpegDir: string; ytdlpCmd: string[] }> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    ensureDir(DOWNLOAD_DIR);

    // Check for yt-dlp via python module or binary
    const hasPythonYtDlp = await commandExists('python3', ['-m', 'yt_dlp', '--version']);
    if (hasPythonYtDlp) {
      // Resolve ffmpeg dir (best effort, may be empty if not needed)
      let ffmpegDir = '';
      try {
        const { stdout } = await execFileAsync(
          'python3',
          ['-c', "import static_ffmpeg, shutil, os; static_ffmpeg.add_paths(); print(os.path.dirname(shutil.which('ffmpeg')) or '')"],
          { timeout: 3000 }
        );
        ffmpegDir = stdout.trim();
      } catch {
        ffmpegDir = '';
      }
      return { ffmpegDir, ytdlpCmd: ['python3', '-m', 'yt_dlp'] };
    }

    // Try yt-dlp binary directly
    const hasBinary = await commandExists('yt-dlp', ['--version']);
    if (hasBinary) {
      return { ffmpegDir: '', ytdlpCmd: ['yt-dlp'] };
    }

    // Last resort: try pip install quickly (only on persistent servers, not Vercel)
    // On Vercel this will likely fail due to read-only FS, so we throw fast
    if (process.env.VERCEL) {
      throw new Error('YTDLP_NOT_AVAILABLE: yt-dlp is not installed on this deployment. Please use a self-hosted instance or Docker deployment for full functionality.');
    }

    try {
      await execFileAsync('pip3', ['install', '--break-system-packages', '--quiet', 'yt-dlp', 'static-ffmpeg'], { timeout: 60000 });
      if (await commandExists('python3', ['-m', 'yt_dlp', '--version'])) {
        const { stdout } = await execFileAsync(
          'python3',
          ['-c', "import static_ffmpeg, shutil, os; static_ffmpeg.add_paths(); print(os.path.dirname(shutil.which('ffmpeg')) or '')"],
          { timeout: 3000 }
        );
        return { ffmpegDir: stdout.trim(), ytdlpCmd: ['python3', '-m', 'yt_dlp'] };
      }
    } catch {
      // ignore
    }
    throw new Error('YTDLP_NOT_AVAILABLE: yt-dlp could not be installed.');
  })();
  // reset on failure so next call retries
  bootstrapPromise.catch(() => { bootstrapPromise = null; });
  return bootstrapPromise;
}

export function isBotBlockedMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('sign in to confirm you’re not a bot') ||
    m.includes('sign in to confirm you are not a bot') ||
    m.includes('confirm you’re not a bot') ||
    m.includes('login_required') ||
    m.includes('your ip address is blocked') ||
    m.includes('empty media response') ||
    m.includes('use --cookies') ||
    m.includes('ytdlp_not_available')
  );
}

export interface VideoMeta {
  title: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
  extractor: string | null;
  directUrl: string | null;
  ext: string | null;
  formatsCount: number;
}

function qualityToHeight(q: string): number {
  switch (q) {
    case '2160p':
      return 2160;
    case '1080p':
      return 1080;
    case '720p':
      return 720;
    case '480p':
      return 480;
    default:
      return 1080;
  }
}

function pickBestUrl(data: any, quality: string, withAudio: boolean): string | null {
  const height = qualityToHeight(quality);
  const formats: any[] = data.formats || [];
  if (!formats.length) return null;

  // Prefer mp4 with both audio and video
  const muxed = formats.filter(
    (f) => f.vcodec !== 'none' && f.acodec !== 'none' && (f.height || 0) <= height && f.url
  );
  if (withAudio && muxed.length) {
    muxed.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0));
    // Prefer mp4
    const mp4 = muxed.find((f) => f.ext === 'mp4');
    return (mp4 || muxed[0]).url as string;
  }

  if (!withAudio) {
    const videoOnly = formats.filter(
      (f) => f.vcodec !== 'none' && f.acodec === 'none' && (f.height || 0) <= height && f.url
    );
    if (videoOnly.length) {
      videoOnly.sort((a, b) => (b.height || 0) - (a.height || 0));
      return videoOnly[0].url as string;
    }
    // fallback to any video
    const anyVideo = formats.filter((f) => f.vcodec !== 'none' && f.url);
    if (anyVideo.length) {
      anyVideo.sort((a, b) => (b.height || 0) - (a.height || 0));
      return anyVideo[0].url as string;
    }
  }

  // Fallback: any muxed or best
  const anyMuxed = formats.filter((f) => f.vcodec !== 'none' && f.acodec !== 'none' && f.url);
  if (anyMuxed.length) {
    anyMuxed.sort((a, b) => (b.height || 0) - (a.height || 0));
    return anyMuxed[0].url as string;
  }

  // Last resort: requested format url or manifest
  if (data.url) return data.url as string;
  return null;
}

export async function getMetadata(url: string, opts?: { quality?: string; withAudio?: boolean }): Promise<VideoMeta> {
  const { ffmpegDir, ytdlpCmd } = await bootstrap();
  const quality = opts?.quality || '720p';
  const withAudio = opts?.withAudio !== false;

  const yArgs = ['--dump-single-json', '--no-warnings', '--no-playlist', '--no-check-certificate'];
  if (ffmpegDir) yArgs.unshift('--ffmpeg-location', ffmpegDir);
  const execCmd = ytdlpCmd[0];
  const fullArgs = [...ytdlpCmd.slice(1), ...yArgs, url];

  const { stdout } = await execFileAsync(execCmd, fullArgs, {
    timeout: 25000,
    maxBuffer: 1024 * 1024 * 48,
  });

  const data = JSON.parse(stdout);
  const directUrl = pickBestUrl(data, quality, withAudio);

  return {
    title: data.title ?? 'Untitled',
    duration: typeof data.duration === 'number' ? data.duration : null,
    thumbnail: data.thumbnail ?? (data.thumbnails?.[0]?.url ?? null),
    uploader: data.uploader ?? data.channel ?? data.uploader_id ?? null,
    extractor: data.extractor_key ?? data.extractor ?? null,
    directUrl,
    ext: data.ext ?? (directUrl ? 'mp4' : null),
    formatsCount: data.formats?.length ?? 0,
  };
}

// Fallback: try oembed/noembed for title/thumb when yt-dlp is blocked
export async function getFallbackMeta(url: string): Promise<Partial<VideoMeta>> {
  try {
    // Try noembed for YouTube
    if (/youtu\.?be/.test(url)) {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const j = await res.json() as any;
        if (j.title) {
          return {
            title: j.title,
            thumbnail: j.thumbnail_url || null,
            uploader: j.author_name || null,
            extractor: 'youtube',
          };
        }
      }
    }
  } catch {
    // ignore
  }
  return {};
}

export interface DownloadOptions {
  url: string;
  withAudio: boolean;
  quality: string;
  jobId: string;
  onProgress?: (percent: number, line: string) => void;
}

export interface DownloadOutcome {
  filePath: string;
  fileName: string;
  fileSize: number;
  ext: string;
}

export async function downloadVideo(opts: DownloadOptions): Promise<DownloadOutcome> {
  const { ffmpegDir, ytdlpCmd } = await bootstrap();
  ensureDir(DOWNLOAD_DIR);

  const height = qualityToHeight(opts.quality);
  const outputTemplate = path.join(DOWNLOAD_DIR, `${opts.jobId}.%(ext)s`);

  const baseExtra: string[] = [];
  if (ffmpegDir) baseExtra.push('--ffmpeg-location', ffmpegDir);
  baseExtra.push('--no-playlist', '--no-warnings', '--newline', '--no-check-certificate');
  const baseArgs = [...ytdlpCmd.slice(1), ...baseExtra];

  if (opts.withAudio) {
    baseArgs.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`, '--merge-output-format', 'mp4');
  } else {
    baseArgs.push('-f', `bestvideo[height<=${height}]/best[height<=${height}]/best`, '--merge-output-format', 'mp4');
  }
  baseArgs.push('-o', outputTemplate, opts.url);

  const execCmd = ytdlpCmd[0];
  const fullArgs = [...baseArgs];

  return new Promise<DownloadOutcome>((resolve, reject) => {
    const child = spawn(execCmd, fullArgs);
    let stderr = '';
    let stdout = '';

    const t = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      reject(new Error('Download timed out after 60s. The video may be too large or the server is overloaded.'));
    }, 60000);

    const handleLine = (line: string) => {
      const m = line.match(/\[download\]\s+([\d.]+)%/);
      if (m && opts.onProgress) opts.onProgress(parseFloat(m[1]), line);
    };

    child.stdout.on('data', (buf: Buffer) => {
      const s = buf.toString();
      stdout += s;
      s.split('\n').forEach((l) => l.trim() && handleLine(l));
    });
    child.stderr.on('data', (buf: Buffer) => {
      stderr += buf.toString();
    });
    child.on('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(t);
      const combined = stderr + stdout;
      if (isBotBlockedMessage(combined)) {
        reject(new Error('BOT_BLOCKED: YouTube/TikTok has blocked this server IP. This is common on Vercel/datacenter hosts. Try a TikTok/Instagram link, or self-host the app with residential IP / Docker.'));
        return;
      }
      if (code !== 0) {
        const msg = (stderr || stdout).slice(-800) || `yt-dlp exited ${code}`;
        // If no file but also not bot, generic error
        reject(new Error(msg));
        return;
      }
      const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(opts.jobId + '.'));
      if (files.length === 0) {
        if (isBotBlockedMessage(combined)) {
          reject(new Error('BOT_BLOCKED: No file produced - likely blocked.'));
        } else {
          reject(new Error('Download finished but no output file was found. The link may be private or unsupported.'));
        }
        return;
      }
      const chosen = files.find((f) => f.endsWith('.mp4')) ?? files[0];
      const filePath = path.join(DOWNLOAD_DIR, chosen);
      const stat = fs.statSync(filePath);
      resolve({ filePath, fileName: chosen, fileSize: stat.size, ext: path.extname(chosen).replace('.', '') });
    });
  });
}
