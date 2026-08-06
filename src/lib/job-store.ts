import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DOWNLOAD_DIR } from '@/lib/ytdlp';

// Lightweight in-memory job tracker. Survives within the same serverless invocation;
// for Vercel stateless use, we also read from disk so the file endpoint can serve it.
const jobMemory: Record<string, {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  title?: string | null;
  thumbnail?: string | null;
  uploader?: string | null;
  duration?: number | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileUrl?: string;
  platform: string;
  withAudio: boolean;
  quality: string;
  error?: string;
}> = {};

export function setJobStatus(id: string, data: Partial<typeof jobMemory[string]>) {
  if (!jobMemory[id]) jobMemory[id] = { status: 'processing', progress: 0, platform: 'unknown', withAudio: true, quality: '1080p' };
  Object.assign(jobMemory[id], data);
  // Persist to disk too so file endpoint can find it across separate requests.
  try {
    const metaPath = path.join(DOWNLOAD_DIR, `${id}.json`);
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    fs.writeFileSync(metaPath, JSON.stringify(jobMemory[id]));
  } catch {
    // ignore disk failures
  }
}

export function getJobStatus(id: string) {
  if (jobMemory[id]) return jobMemory[id];
  try {
    const metaPath = path.join(DOWNLOAD_DIR, `${id}.json`);
    if (fs.existsSync(metaPath)) {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      jobMemory[id] = data;
      return data;
    }
  } catch {
    // ignore
  }
  return null;
}
