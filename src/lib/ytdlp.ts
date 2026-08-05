import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

// Directory where downloaded files are temporarily stored
export const DOWNLOAD_DIR = path.join(os.tmpdir(), 'clipvault-downloads');

let bootstrapPromise: Promise<{ ffmpegDir: string }> | null = null;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function commandExists(cmd: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(cmd, args, { timeout: 20000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures yt-dlp (python module) and a static ffmpeg build are available.
 * Runtime-installs them if missing so the app keeps working after a fresh boot.
 * Returns the directory that contains the ffmpeg/ffprobe binaries.
 */
export async function bootstrap(): Promise<{ ffmpegDir: string }> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    ensureDir(DOWNLOAD_DIR);

    // 1. Ensure yt-dlp python module is installed
    const hasYtdlp = await commandExists('python3', ['-m', 'yt_dlp', '--version']);
    if (!hasYtdlp) {
      try {
        await execFileAsync(
          'pip3',
          ['install', '--break-system-packages', '--quiet', 'yt-dlp', 'static-ffmpeg'],
          { timeout: 180000 }
        );
      } catch (e) {
        // Try without break-system-packages as a fallback
        await execFileAsync('pip3', ['install', '--quiet', 'yt-dlp', 'static-ffmpeg'], {
          timeout: 180000,
        });
      }
    }

    // 2. Resolve ffmpeg directory (install static-ffmpeg binaries if needed)
    let ffmpegDir = '';
    try {
      const { stdout } = await execFileAsync(
        'python3',
        [
          '-c',
          "import static_ffmpeg, os; static_ffmpeg.add_paths(); import shutil; print(os.path.dirname(shutil.which('ffmpeg')))",
        ],
        { timeout: 180000 }
      );
      ffmpegDir = stdout.trim();
    } catch {
      // static-ffmpeg not present yet — install then resolve
      try {
        await execFileAsync('pip3', ['install', '--break-system-packages', '--quiet', 'static-ffmpeg'], {
          timeout: 180000,
        });
      } catch {
        await execFileAsync('pip3', ['install', '--quiet', 'static-ffmpeg'], { timeout: 180000 });
      }
      const { stdout } = await execFileAsync(
        'python3',
        [
          '-c',
          "import static_ffmpeg, os; static_ffmpeg.add_paths(); import shutil; print(os.path.dirname(shutil.which('ffmpeg')))",
        ],
        { timeout: 180000 }
      );
      ffmpegDir = stdout.trim();
    }

    return { ffmpegDir };
  })();

  return bootstrapPromise;
}

export interface VideoMeta {
  title: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
  extractor: string | null;
}

/** Fetch metadata about a video without downloading it. */
export async function getMetadata(url: string): Promise<VideoMeta> {
  const { ffmpegDir } = await bootstrap();
  const { stdout } = await execFileAsync(
    'python3',
    [
      '-m',
      'yt_dlp',
      '--ffmpeg-location',
      ffmpegDir,
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      url,
    ],
    { timeout: 90000, maxBuffer: 1024 * 1024 * 64 }
  );
  const data = JSON.parse(stdout);
  return {
    title: data.title ?? 'Untitled',
    duration: typeof data.duration === 'number' ? data.duration : null,
    thumbnail: data.thumbnail ?? null,
    uploader: data.uploader ?? data.channel ?? null,
    extractor: data.extractor_key ?? data.extractor ?? null,
  };
}

function qualityToHeight(quality: string): number {
  switch (quality) {
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

/**
 * Downloads a video/audio using yt-dlp. Resolves with the produced file path.
 */
export async function downloadVideo(opts: DownloadOptions): Promise<DownloadOutcome> {
  const { ffmpegDir } = await bootstrap();
  ensureDir(DOWNLOAD_DIR);

  const height = qualityToHeight(opts.quality);
  const outputTemplate = path.join(DOWNLOAD_DIR, `${opts.jobId}.%(ext)s`);

  const args = ['-m', 'yt_dlp', '--ffmpeg-location', ffmpegDir, '--no-playlist', '--no-warnings', '--newline'];

  if (opts.withAudio) {
    // Best video up to requested height + best audio, merged into mp4
    args.push(
      '-f',
      `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
      '--merge-output-format',
      'mp4'
    );
  } else {
    // Video only, no audio track
    args.push(
      '-f',
      `bestvideo[height<=${height}]/best[height<=${height}]/best`,
      '--merge-output-format',
      'mp4'
    );
  }

  args.push('-o', outputTemplate, opts.url);

  return new Promise<DownloadOutcome>((resolve, reject) => {
    const child = spawn('python3', args, { timeout: 300000 });
    let stderr = '';

    const handleLine = (line: string) => {
      const m = line.match(/\[download\]\s+([\d.]+)%/);
      if (m && opts.onProgress) {
        opts.onProgress(parseFloat(m[1]), line);
      }
    };

    child.stdout.on('data', (buf: Buffer) => {
      buf
        .toString()
        .split('\n')
        .forEach((l) => l.trim() && handleLine(l));
    });

    child.stderr.on('data', (buf: Buffer) => {
      stderr += buf.toString();
    });

    child.on('error', (err) => reject(err));

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(-500)}`));
        return;
      }
      // Find the produced file matching jobId
      const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(opts.jobId + '.'));
      if (files.length === 0) {
        reject(new Error('Download finished but no output file was found.'));
        return;
      }
      // Prefer mp4 if multiple
      const chosen = files.find((f) => f.endsWith('.mp4')) ?? files[0];
      const filePath = path.join(DOWNLOAD_DIR, chosen);
      const stat = fs.statSync(filePath);
      resolve({
        filePath,
        fileName: chosen,
        fileSize: stat.size,
        ext: path.extname(chosen).replace('.', ''),
      });
    });
  });
}
