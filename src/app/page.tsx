"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Play, Music2, Video, Sparkles, Download, Check, Zap,
  Film, Volume2, VolumeX, ChevronDown, Link2, ShieldCheck,
  TrendingUp, RefreshCw, Info, Image, Clock
} from 'lucide-react';

// --- Types ---
interface DownloadResult {
  jobId: string;
  status: string;
  platform: string;
  withAudio: boolean;
  quality: string;
  title?: string | null;
  thumbnail?: string | null;
  uploader?: string | null;
  duration?: number | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileUrl?: string;
}

// --- Components ---

function PlatformCard({
  label,
  subtitle,
  icon: Icon,
  active,
  onClick,
  colorClass,
}: {
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; size?: number }>
  active: boolean;
  onClick: () => void;
  colorClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start gap-3 rounded-2xl border px-5 py-5 text-left transition-all duration-300 hover:-translate-y-0.5 ${
        active
          ? 'border-indigo-500/60 bg-indigo-500/[0.08] shadow-[0_0_30px_rgba(99,102,241,0.15)]'
          : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.06]'
      }`}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-white">{label}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      {active && (
        <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]" />
      )}
    </button>
  );
}

function QualityDropdown({
  quality,
  setQuality,
}: {
  quality: string;
  setQuality: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: '4K (2160p)', value: '2160p', note: 'Best quality' },
    { label: '1080p Full HD', value: '1080p', note: 'Standard' },
    { label: '720p HD', value: '720p', note: 'Smaller file' },
    { label: '480p SD', value: '480p', note: 'Fastest' },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-white/[0.15] hover:bg-white/[0.06]"
      >
        <Film size={16} className="text-slate-400" />
        <span className="font-medium">{quality}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0f1320] shadow-2xl shadow-black/50 backdrop-blur-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setQuality(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left transition hover:bg-white/[0.06] ${quality === opt.value ? 'bg-indigo-500/[0.1]' : ''}`}
            >
              <div className="text-sm font-medium text-white">{opt.label}</div>
              <div className="text-xs text-slate-500">{opt.note}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function DownloaderPage() {
  const [platform, setPlatform] = useState('youtube');
  const [url, setUrl] = useState('');
  const [withAudio, setWithAudio] = useState(true);
  const [quality, setQuality] = useState('1080p');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState('');
  const [statusLabel, setStatusLabel] = useState('');
  const [pollingId, setPollingId] = useState<number | null>(null);

  const platforms = [
    { key: 'youtube', label: 'YouTube Video', subtitle: 'Standard videos', icon: Play, color: 'bg-rose-500/15 text-rose-400' },
    { key: 'youtube-shorts', label: 'YouTube Shorts', subtitle: 'Short-form clips', icon: Zap, color: 'bg-amber-500/15 text-amber-400' },
    { key: 'instagram-reels', label: 'Instagram Reels', subtitle: 'Reels & clips', icon: Video, color: 'bg-gradient-to-br from-fuchsia-500/20 to-rose-500/20 text-fuchsia-300' },
    { key: 'instagram-post', label: 'Instagram Posts', subtitle: 'Photos & videos', icon: Sparkles, color: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300' },
    { key: 'tiktok', label: 'TikTok Reels', subtitle: 'TikTok videos', icon: Music2, color: 'bg-cyan-500/15 text-cyan-400' },
  ];

  const handleSubmit = useCallback(async () => {
    if (!url.trim()) {
      setError('Please paste a video link');
      return;
    }
    setError('');
    setLoading(true);
    setProgress(0);
    setStatusLabel('Starting…');
    setResult(null);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, withAudio, quality }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      const jobId: string = data.jobId;
      setStatusLabel('Fetching video info…');

      // Poll the real job status every second.
      const pollInterval = setInterval(async () => {
        try {
          const poll = await fetch(`/api/download/${jobId}`);
          const pollData = await poll.json();

          if (pollData.status === 'processing') {
            setProgress(pollData.progress ?? 0);
            setStatusLabel(
              pollData.title ? `Downloading “${pollData.title}”` : 'Downloading…'
            );
          } else if (pollData.status === 'completed') {
            clearInterval(pollInterval);
            setProgress(100);
            setResult({
              jobId,
              status: 'completed',
              platform: pollData.platform ?? platform,
              withAudio: pollData.withAudio ?? withAudio,
              quality: pollData.quality ?? quality,
              title: pollData.title,
              thumbnail: pollData.thumbnail,
              uploader: pollData.uploader,
              duration: pollData.duration,
              fileName: pollData.fileName,
              fileSize: pollData.fileSize,
              fileUrl: pollData.fileUrl,
            });
            setLoading(false);
          } else if (pollData.status === 'failed') {
            clearInterval(pollInterval);
            setError(pollData.error || 'Download failed. The link may be private or unsupported.');
            setLoading(false);
          }
        } catch {
          // transient error — keep polling
        }
      }, 1000);
      setPollingId(pollInterval as unknown as number);
    } catch {
      setError('Failed to process download');
      setLoading(false);
    }
  }, [url, platform, withAudio, quality]);

  useEffect(() => {
    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [pollingId]);

  const getPlatformName = (key: string) => platforms.find(p => p.key === key)?.label || key;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[70vh] w-[70vw] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[60vh] w-[50vw] rounded-full bg-violet-500/15 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-30 mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Download size={18} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">ClipVault</span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-400 sm:flex">
            <a href="#" className="transition hover:text-white">How it works</a>
            <a href="#" className="transition hover:text-white">Supported platforms</a>
            <a href="#" className="transition hover:text-white">Privacy</a>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12 md:py-20">
        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md">
            <Sparkles size={14} className="text-amber-400" />
            <span>Free, fast, no registration required</span>
          </div>
          <h1 className="mt-6 text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight text-white">
            Download any video from
            <span className="block bg-gradient-to-r from-indigo-400 via-fuchsia-300 to-rose-300 bg-clip-text text-transparent">YouTube, Instagram & TikTok</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            Paste a link, choose quality and audio options, and get your video instantly — no watermarks, no ads.
          </p>
        </section>

        {/* Main Card */}
        <section className="mx-auto mt-16 max-w-3xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-[#111827]/80 to-[#0a0e17]/60 p-1 shadow-[0_40px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="rounded-[1.8rem] bg-[#0f1320]/60 p-6 md:p-10">
              {/* Platform selection */}
              <div className="mb-6">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-slate-500">Select platform</label>
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5 md:gap-3">
                  {platforms.map((p) => (
                    <PlatformCard
                      key={p.key}
                      label={p.label}
                      subtitle={p.subtitle}
                      icon={p.icon}
                      active={platform === p.key}
                      onClick={() => setPlatform(p.key)}
                      colorClass={p.color}
                    />
                  ))}
                </div>
              </div>

              {/* URL Input */}
              <div className="mb-6">
                <label htmlFor="url" className="mb-3 block text-xs font-semibold uppercase tracking-widest text-slate-500">Paste video link</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Link2 size={20} />
                  </div>
                  <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={`e.g. https://youtube.com/watch?v=...`}
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-4 pl-12 pr-4 text-base text-white placeholder:text-slate-600 transition focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                  />
                </div>
                {error && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-rose-400">
                    <Info size={14} /> {error}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <button
                    onClick={() => setWithAudio(!withAudio)}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${withAudio ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}
                  >
                    {withAudio ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    {withAudio ? 'With Audio' : 'No Audio'}
                  </button>
                </div>
                <QualityDropdown quality={quality} setQuality={setQuality} />
              </div>

              {/* Download Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || !url.trim()}
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-base font-bold text-white shadow-[0_0_40px_rgba(99,102,241,0.35)] transition hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:-translate-y-0"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-white/10 to-violet-600/0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <Download size={20} />
                  )}
                  <span>{loading ? 'Processing Download...' : 'Download Now'}</span>
                </span>
              </button>

              {/* Progress */}
              {loading && (
                <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="truncate pr-3 font-medium text-white">{statusLabel || 'Preparing file'}</span>
                    <span className="shrink-0 text-slate-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Status</div>
                      <div className="mt-1 text-sm font-semibold text-amber-400">Processing</div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Quality</div>
                      <div className="mt-1 text-sm font-semibold text-white">{quality}</div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Audio</div>
                      <div className="mt-1 text-sm font-semibold text-white">{withAudio ? 'Included' : 'Excluded'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Result */}
              {!loading && result && result.status === 'completed' && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/[0.15] to-teal-900/[0.1] p-6 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                    <div className="flex items-start gap-4">
                      {result.thumbnail ? (
                        <img
                          src={result.thumbnail}
                          alt={result.title || 'thumbnail'}
                          className="h-20 w-32 shrink-0 rounded-xl border border-white/[0.08] object-cover shadow-lg"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                          <Check size={28} className="text-emerald-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Check size={16} className="shrink-0 text-emerald-400" />
                          <h3 className="text-lg font-bold text-white">Download Ready</h3>
                        </div>
                        {result.title && (
                          <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-200">{result.title}</p>
                        )}
                        {result.uploader && (
                          <p className="text-xs text-slate-500">by {result.uploader}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">{getPlatformName(result.platform)}</span>
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">{result.quality}</span>
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">{result.withAudio ? 'With Audio' : 'No Audio'}</span>
                          {typeof result.duration === 'number' && result.duration > 0 && (
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                              {Math.floor(result.duration / 60)}:{String(result.duration % 60).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <a
                      href={result.fileUrl}
                      download
                      className="mt-6 flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] transition hover:shadow-[0_0_50px_rgba(16,185,129,0.45)] hover:-translate-y-0.5"
                    >
                      <Download size={20} />
                      <span>Save Video File</span>
                    </a>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                      <span>File size: {result.fileSize ? Math.round(result.fileSize / 1024 / 1024) + ' MB' : '--'}</span>
                      <button
                        onClick={() => { setResult(null); setUrl(''); }}
                        className="text-slate-400 underline-offset-2 hover:text-white hover:underline"
                      >
                        Download another
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto mt-24 max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-5xl">Why creators choose ClipVault</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { title: 'No Watermarks', desc: 'Download clean videos without branding or overlays.', icon: ShieldCheck, color: 'text-violet-400 bg-violet-500/10' },
              { title: 'Any Quality', desc: 'Choose from 4K down to 480p — you decide the balance.', icon: TrendingUp, color: 'text-rose-400 bg-rose-500/10' },
              { title: 'Instant Results', desc: 'Processing starts immediately with real-time progress.', icon: Zap, color: 'text-amber-400 bg-amber-500/10' },
            ].map((feat) => (
              <div key={feat.title} className="group rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition hover:border-white/[0.12] hover:bg-white/[0.04] hover:-translate-y-1">
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feat.color}`}>
                  <feat.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported Platforms */}
        <section className="mx-auto mt-24 max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">Works with these platforms</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {platforms.map((p) => (
              <a
                key={p.key}
                href="#"
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center transition hover:border-white/[0.1] hover:bg-white/[0.04]"
              >
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${p.color}`}>
                  <p.icon size={26} />
                </div>
                <h4 className="font-semibold text-white">{p.label}</h4>
              </a>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto mt-24 max-w-4xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { step: '01', title: 'Paste Link', desc: 'Copy a video URL from YouTube, Instagram, or TikTok.', icon: Link2 },
              { step: '02', title: 'Select Options', desc: 'Choose audio inclusion and preferred video quality.', icon: Play },
              { step: '03', title: 'Download', desc: 'Hit download and save your file instantly.', icon: Download },
            ].map((item) => (
              <div key={item.step} className="relative rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#111827] to-[#0a0e17] p-8">
                <div className="absolute -top-4 -right-2 text-7xl font-black text-white/[0.03]">{item.step}</div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <item.icon size={22} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-24 border-t border-white/[0.06] bg-[#080b14]/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Download size={16} strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold tracking-tight">ClipVault</span>
            </div>
            <p className="max-w-md text-right text-xs text-slate-500">Powered by yt-dlp. Please respect creators&apos; rights and only download content you have permission to use.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
