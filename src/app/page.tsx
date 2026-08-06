"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Download, Play, Zap, Video, Sparkles, Music2, Link2, ShieldCheck, Globe, Cpu, Clock3,
  Film, Volume2, VolumeX, ChevronDown, Check, Info, ExternalLink, ArrowRight, Copy, RefreshCw,
  GitBranch, Rocket, Cloud, Box, Timer, Layers, EyeOff, Smartphone, Monitor, Sparkle, Star, BookOpen, Wrench
} from "lucide-react";

// Types
type PlatformKey = "youtube" | "youtube-shorts" | "instagram-reels" | "instagram-post" | "tiktok";
interface Result {
  jobId: string;
  status: "completed" | "blocked";
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
  isDirect?: boolean;
}

const PLATFORMS: { key: PlatformKey; label: string; sub: string; icon: any; grad: string }[] = [
  { key: "youtube", label: "YouTube", sub: "Videos & Music", icon: Play, grad: "from-red-500 to-orange-500" },
  { key: "youtube-shorts", label: "Shorts", sub: "Vertical clips", icon: Zap, grad: "from-amber-500 to-red-500" },
  { key: "instagram-reels", label: "Instagram", sub: "Reels", icon: Video, grad: "from-fuchsia-500 via-pink-500 to-orange-400" },
  { key: "instagram-post", label: "IG Post", sub: "Carousel & Photo", icon: Sparkles, grad: "from-violet-500 to-fuchsia-500" },
  { key: "tiktok", label: "TikTok", sub: "No watermark", icon: Music2, grad: "from-cyan-400 to-teal-400" },
];

function QualityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const opts = [
    { v: "2160p", l: "4K • 2160p", d: "Best" },
    { v: "1080p", l: "1080p • Full HD", d: "Recommended" },
    { v: "720p", l: "720p • HD", d: "Fast" },
    { v: "480p", l: "480p • SD", d: "Lightest" },
  ];
  const cur = opts.find(o => o.v === value) ?? opts[1];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm font-medium backdrop-blur hover:bg-white/[0.09] transition">
        <Film size={14} className="text-white/60" />
        {cur.l}
        <ChevronDown size={14} className={`text-white/40 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] p-1 shadow-2xl">
          {opts.map(o => (
            <button key={o.v} onClick={() => { onChange(o.v); setOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${value === o.v ? "bg-violet-600 text-white" : "text-white/80 hover:bg-white/5"}`}>
              <span className="font-medium">{o.l}</span><span className="text-xs opacity-60">{o.d}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<PlatformKey>("youtube");
  const [withAudio, setWithAudio] = useState(true);
  const [quality, setQuality] = useState("1080p");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pollId, setPollId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!url.trim()) { setError("Paste a link first"); return; }
    if (pollId) { clearInterval(pollId); setPollId(null); }
    setError(""); setResult(null); setLoading(true); setProgress(6); setStatus("Contacting server…");

    const ctrl = new AbortController();
    const tId = setTimeout(() => ctrl.abort(), 55000);
    const fake = setInterval(() => setProgress(p => p < 82 ? Math.min(82, p + Math.random() * 5) : p), 650);
    const ticker = setInterval(() => setStatus(s => s.includes("Contacting") ? "Fetching video info…" : s.includes("Fetching") ? "Resolving stream…" : "Preparing download…"), 2200);

    try {
      const r = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, withAudio, quality }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (!r.ok || d.error) {
        if (d.code === "BOT_BLOCKED") {
          setError(d.error);
          if (d.title || d.thumbnail) setResult({ jobId: d.jobId || "", status: "blocked", platform, withAudio, quality, title: d.title, thumbnail: d.thumbnail });
        } else setError(d.error || d.details || "Something went wrong");
        return;
      }
      if (d.status === "completed" && d.fileUrl) {
        setProgress(100); setStatus("Ready!");
        setResult({ jobId: d.jobId, status: "completed", platform: d.platform ?? platform, withAudio: d.withAudio ?? withAudio, quality: d.quality ?? quality, title: d.title, thumbnail: d.thumbnail, uploader: d.uploader, duration: d.duration, fileName: d.fileName, fileSize: d.fileSize, fileUrl: d.fileUrl, isDirect: !!d.isDirect });
        return;
      }
      // polling fallback (local)
      if (d.jobId && d.status === "processing") {
        const id = d.jobId as string;
        setStatus("Fetching video info…");
        const iv = setInterval(async () => {
          try {
            const pr = await fetch(`/api/download/${id}`); const pd = await pr.json();
            if (pd.status === "processing") { setProgress(pd.progress ?? 0); setStatus(pd.title ? `Downloading "${pd.title.slice(0, 32)}…"` : "Downloading…"); }
            else if (pd.status === "completed") { clearInterval(iv); setProgress(100); setResult({ jobId: id, status: "completed", platform: pd.platform ?? platform, withAudio: pd.withAudio ?? withAudio, quality: pd.quality ?? quality, title: pd.title, thumbnail: pd.thumbnail, uploader: pd.uploader, duration: pd.duration, fileName: pd.fileName, fileSize: pd.fileSize, fileUrl: pd.fileUrl, isDirect: !!pd.isDirect }); setLoading(false); setPollId(null); }
            else if (pd.status === "failed" || pd.error) { clearInterval(iv); setError(pd.error || "Download failed"); setLoading(false); setPollId(null); }
          } catch { }
        }, 1000);
        setPollId(iv as unknown as number);
        setTimeout(() => { clearInterval(iv); setLoading(l => { if (l) setError("Timed out — try a shorter video or self-host."); return false; }); }, 60000);
        return;
      }
      setError("Unexpected response");
    } catch (e: any) {
      if (e?.name === "AbortError") setError("Request timed out (>55s). YouTube may be blocking this server. Try self-hosting.");
      else setError(e?.message || "Failed");
    } finally { clearTimeout(tId); clearInterval(fake); clearInterval(ticker); setLoading(false); }
  }, [url, platform, withAudio, quality, pollId]);

  useEffect(() => () => { if (pollId) clearInterval(pollId); }, [pollId]);

  const platformMeta = PLATFORMS.find(p => p.key === platform)!;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* BG */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#050507]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="absolute -top-[30%] left-1/2 h-[900px] w-[1400px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.22),_transparent_60%)] blur-3xl" />
        <div className="absolute top-[18%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.18),_transparent_65%)] blur-3xl" />
        <div className="absolute top-[55%] -left-[10%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,_rgba(6,182,214,0.12),_transparent_65%)] blur-3xl" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white text-black">
              <Download size={18} strokeWidth={2.5} />
            </div>
            <span className="font-display text-[18px] font-bold tracking-tight">ClipVault</span>
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white/60 md:inline">v2 • 2026</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/60 md:flex">
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="/deploy" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 transition">Deploy free <Rocket size={14} /></a>
          </nav>
          <a href="/deploy" className="md:hidden inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">Deploy</a>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1180px] px-6">
        {/* Hero */}
        <section className="pb-8 pt-10 md:pt-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-medium text-white/80">No watermark • No signup • 4K supported</span>
              <span className="hidden items-center gap-1 text-white/40 md:inline-flex">• <Star size={12} className="text-amber-400" /> Trusted by 50k+ creators</span>
            </div>
            <h1 className="font-display mt-6 text-[36px] font-[800] leading-[0.95] tracking-[-0.03em] md:text-[62px]">
              Download any video
              <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">in one paste.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-6 text-white/60 md:text-[16px]">
              YouTube, Shorts, Instagram Reels & TikTok — paste a link, pick quality and audio, get a real MP4 instantly.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/35">
              <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Privacy-first</span>•
              <span className="inline-flex items-center gap-1"><EyeOff size={12} /> No tracking</span>•
              <span className="inline-flex items-center gap-1"><Layers size={12} /> Open source logic</span>
            </div>
          </div>

          {/* Downloader Card */}
          <div className="mx-auto mt-8 max-w-[780px]">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-[1px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="rounded-[27px] bg-gradient-to-b from-white/[0.07] to-transparent p-6 md:p-7">
                {/* Platform tabs */}
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPlatform(p.key)}
                      className={`group flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-left transition ${platform === p.key ? "border-white bg-white text-black shadow" : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"}`}
                    >
                      <span className={`flex size-7 items-center justify-center rounded-full bg-gradient-to-br text-white ${p.grad} ${platform === p.key ? "opacity-100" : "opacity-90"}`}>
                        <p.icon size={14} />
                      </span>
                      <span className="text-xs font-semibold leading-none">{p.label}<span className="block text-[10px] font-normal opacity-60">{p.sub}</span></span>
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="mt-5">
                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"><Link2 size={18} /></div>
                    <input
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleDownload()}
                      placeholder={`Paste ${platformMeta.label} link — e.g. youtube.com/watch?v=...`}
                      className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] py-4 pl-11 pr-28 text-[15px] font-medium text-white placeholder:text-white/30 focus:border-violet-500/40 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition md:pr-36"
                    />
                    <button onClick={() => { navigator.clipboard.readText().then(t => setUrl(t)).catch(() => {}); }} className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 md:inline-flex">
                      <Copy size={12} /> Paste
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button onClick={() => setWithAudio(!withAudio)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${withAudio ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-white/60"}`}>
                      {withAudio ? <Volume2 size={12} /> : <VolumeX size={12} />} {withAudio ? "With audio" : "No audio (video only)"}
                    </button>
                    <QualityPicker value={quality} onChange={setQuality} />
                    <span className="ml-auto hidden items-center gap-1 text-xs text-white/30 md:inline-flex"><Timer size={12} /> ~5s for most videos</span>
                  </div>
                  {error && (
                    <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                      <div className="flex gap-2 text-sm leading-relaxed text-red-200"><Info size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>
                      {error.toLowerCase().includes("blocking") && (
                        <div className="mt-3 rounded-xl bg-black/30 p-3 text-xs leading-relaxed text-white/60">
                          <p className="font-semibold text-white">Why on free hosting?</p>
                          <p className="mt-1">YouTube & TikTok block datacenter IPs (Vercel/Railway free). Your links are <b className="text-white">not broken</b>.</p>
                          <ul className="mt-2 list-disc space-y-1 pl-4">
                            <li>Try <b>TikTok / Instagram</b> — they work more often</li>
                            <li>Self-host: <a href="/deploy" className="underline decoration-violet-400 underline-offset-4">Deploy free with Docker → own IP</a></li>
                            <li>Add <code className="rounded bg-white/10 px-1 py-0.5">YTDLP_COOKIES</code> in Vercel env (export from browser)</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button onClick={handleDownload} disabled={loading || !url.trim()} className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-black transition hover:bg-white/90 disabled:opacity-50">
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-fuchsia-500/10 to-cyan-400/0 opacity-0 transition group-hover:opacity-100" />
                  <span className="relative flex items-center gap-2">{loading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />} {loading ? "Processing…" : "Download video"}</span>
                  <ArrowRight size={16} className="relative opacity-60 transition group-hover:translate-x-0.5" />
                </button>
                <p className="mt-2 text-center text-xs text-white/30">By using ClipVault you agree to only download content you have rights to.</p>

                {/* Progress */}
                {loading && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between text-sm"><span className="truncate pr-3 font-medium">{status}</span><span className="text-white/50">{Math.round(progress)}%</span></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} /></div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-white/[0.06] py-2"><div className="text-white/40">Quality</div><div className="font-semibold">{quality}</div></div>
                      <div className="rounded-xl bg-white/[0.06] py-2"><div className="text-white/40">Audio</div><div className="font-semibold">{withAudio ? "Yes" : "No"}</div></div>
                      <div className="rounded-xl bg-white/[0.06] py-2"><div className="text-white/40">Source</div><div className="font-semibold">{platformMeta.label}</div></div>
                    </div>
                  </div>
                )}

                {/* Blocked */}
                {!loading && result?.status === "blocked" && (
                  <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="flex gap-3">
                      {result.thumbnail ? <img src={result.thumbnail} alt="" className="size-20 shrink-0 rounded-xl object-cover" /> : <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-amber-500/20"><Info size={20} className="text-amber-300" /></div>}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-amber-100">Video found — download blocked</div>
                        {result.title && <div className="mt-1 line-clamp-2 text-sm text-white">{result.title}</div>}
                        <div className="mt-1 text-xs text-amber-200/70">Server IP blocked. Self-host to get your own IP (free) → <a href="/deploy" className="underline">Deploy guide</a></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success */}
                {!loading && result?.status === "completed" && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4">
                    <div className="flex gap-4">
                      {result.thumbnail ? <img src={result.thumbnail} alt="" className="h-24 w-36 shrink-0 rounded-xl object-cover" /> : <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15"><Check size={22} className="text-emerald-400" /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-black"><Check size={12} /> Ready</div>
                        {result.title && <div className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">{result.title}</div>}
                        {result.uploader && <div className="text-xs text-white/50">by {result.uploader} {result.duration ? `• ${Math.floor(result.duration / 60)}:${String(result.duration % 60).padStart(2, "0")}` : ""}</div>}
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                          <span className="rounded-full bg-white px-2 py-1 font-semibold text-black">{result.quality}</span>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-white/70">{result.withAudio ? "With audio" : "No audio"}</span>
                          {result.isDirect && <span className="rounded-full bg-emerald-500 px-2 py-1 font-semibold text-black">Direct CDN</span>}
                        </div>
                      </div>
                    </div>
                    <a
                      href={result.isDirect ? `/api/proxy?url=${encodeURIComponent(result.fileUrl || "")}` : result.fileUrl}
                      download={!result.isDirect ? (result.fileName || "video.mp4") : undefined}
                      target={result.isDirect ? "_blank" : undefined}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-black hover:bg-emerald-400 transition"
                    >
                      <Download size={18} /> {result.isDirect ? "Open / Save (Direct CDN)" : "Save MP4 file"}
                    </a>
                    <div className="mt-2 flex items-center justify-between text-xs text-white/40">
                      <span>{result.fileSize ? `${Math.round(result.fileSize / 1024 / 1024)} MB` : result.isDirect ? "Streaming • no server storage" : ""}</span>
                      <button onClick={() => { setResult(null); setUrl(""); setError(""); }} className="hover:text-white underline-offset-4 hover:underline">Download another →</button>
                    </div>
                    {result.isDirect && <p className="mt-2 text-center text-xs text-white/30">On iPhone: long-press → Save to Files.</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs md:grid-cols-6">
              {[
                { k: "No watermark", i: Sparkle },
                { k: "4K • 60fps", i: Monitor },
                { k: "MP4 / MP3", i: Film },
                { k: "Private", i: ShieldCheck },
                { k: "Fast • 5s", i: Zap },
                { k: "Mobile ready", i: Smartphone },
              ].map(o => (
                <div key={o.k} className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 backdrop-blur"><o.i size={16} className="mx-auto text-white/40" /><div className="mt-1 font-medium text-white/70">{o.k}</div></div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Features */}
        <section id="features" className="mt-14">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:col-span-7">
              <div className="inline-flex size-10 items-center justify-center rounded-xl bg-violet-600"><Layers size={18} /></div>
              <h3 className="font-display mt-4 text-xl font-bold">All platforms. One box.</h3>
              <p className="mt-1.5 text-sm leading-6 text-white/60">YouTube (videos, Shorts, Music), Instagram (Reels, posts, carousels), TikTok (with/without watermark). Paste anything — we detect it.</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-black/30 p-4"><div className="font-semibold">Audio or not</div><div className="text-xs text-white/50">Keep music or get clean video-only for edits.</div></div>
                <div className="rounded-2xl bg-black/30 p-4"><div className="font-semibold">Quality picker</div><div className="text-xs text-white/50">4K, 1080p, 720p, 480p — we pick the best mux.</div></div>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white to-white/70 p-6 text-black md:col-span-5">
              <div className="inline-flex size-10 items-center justify-center rounded-xl bg-black text-white"><Cpu size={18} /></div>
              <h3 className="font-display mt-4 text-xl font-bold tracking-tight">Built for speed.</h3>
              <p className="mt-1.5 text-sm leading-6 text-black/60">Direct Google CDN links when possible — no server storage. Falls back to real yt-dlp + ffmpeg when needed. No DB required.</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white"><Timer size={12} /> Avg 3–7 seconds</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:col-span-5">
              <div className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-black"><ShieldCheck size={18} /></div>
              <h3 className="font-display mt-4 text-lg font-bold">Privacy-first</h3>
              <p className="mt-1 text-sm text-white/60">No accounts, no tracking, no logs. Files never stored (direct CDN) or auto-deleted from /tmp. EU-friendly.</p>
              <div className="mt-4 flex gap-2 text-xs text-white/50"><span className="rounded-full bg-white/10 px-2 py-1">No cookies*</span><span className="rounded-full bg-white/10 px-2 py-1">No watermark</span></div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:col-span-7">
              <h3 className="font-display text-lg font-bold">Modern. Minimal. Fast.</h3>
              <p className="mt-1 text-sm text-white/60">Inspired by Linear & Stripe — clean, quiet, precise. Works on desktop & mobile, light & dark.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center"><Globe size={16} className="mx-auto text-white/50" /><div className="mt-1 text-xs font-semibold">Any browser</div></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center"><Smartphone size={16} className="mx-auto text-white/50" /><div className="mt-1 text-xs font-semibold">iOS & Android</div></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center"><Box size={16} className="mx-auto text-white/50" /><div className="mt-1 text-xs font-semibold">No app needed</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* How */}
        <section id="how" className="mt-14 rounded-[24px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold">How it works</h2>
            <a href="/deploy" className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white">Host it yourself free <ArrowRight size={14} /></a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Paste link", d: "Copy share URL from YouTube / IG / TikTok.", icon: Link2 },
              { n: "02", t: "Pick options", d: "Choose 4K–480p and audio on/off.", icon: Wrench },
              { n: "03", t: "Download", d: "Get a real MP4 via direct CDN or proxy.", icon: Download },
            ].map(s => (
              <div key={s.n} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-6">
                <div className="text-5xl font-black leading-none text-white/[0.06]">{s.n}</div>
                <div className="mt-2 inline-flex size-9 items-center justify-center rounded-xl bg-white text-black"><s.icon size={16} /></div>
                <div className="mt-3 font-semibold">{s.t}</div><div className="mt-1 text-sm leading-6 text-white/60">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Hosting teaser */}
        <section className="mt-14 rounded-[24px] border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-500/10 p-6 backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-black"><Rocket size={12} /> Free hosting • Custom domain</div>
              <h2 className="font-display mt-3 text-2xl font-bold">Host ClipVault free with your own domain</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">We made a complete guide: GitHub → Vercel in 3 minutes, plus Railway/Render for full YouTube support (Vercel blocks YouTube IPs) and Cloudflare custom domain.</p>
            </div>
            <div className="flex flex-col gap-3">
              <a href="/deploy" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black hover:bg-white/90 transition">Step-by-step guide <ArrowRight size={16} /></a>
              <div className="flex items-center justify-center gap-3 text-xs text-white/50"><span className="inline-flex items-center gap-1"><GitBranch size={12} /> GitHub</span><span>•</span><span className="inline-flex items-center gap-1"><Cloud size={12} /> Vercel</span><span>•</span><span className="inline-flex items-center gap-1"><Globe size={12} /> Cloudflare</span></div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-2xl bg-black/30 p-4"><div className="font-semibold text-white">Option A — Vercel (free)</div><div className="text-xs text-white/60">1-click import. Works for TikTok/IG; YouTube blocked on free IPs — we show why & fixes.</div></div>
            <div className="rounded-2xl bg-black/30 p-4"><div className="font-semibold text-white">Option B — Railway / Render</div><div className="text-xs text-white/60">Free tier with own IP + Docker. Full YouTube/TikTok support via yt-dlp+ffmpeg.</div></div>
            <div className="rounded-2xl bg-black/30 p-4"><div className="font-semibold text-white">Custom domain</div><div className="text-xs text-white/60">video.yourdomain.com free via Vercel or Cloudflare. 5-min DNS.</div></div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="font-display text-xl font-bold">FAQ</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              { q: "Is it really free?", a: "Yes. No paywall. Self-host free on Vercel/Railway, or use this demo. Direct CDN links cost us nothing." },
              { q: "Why YouTube 'blocked' on Vercel?", a: "YouTube blocks datacenter IPs (Vercel, AWS). It's not your link — self-host with Docker/Railway gives you a residential-like IP." },
              { q: "Do you keep my videos?", a: "No. Direct CDN = proxied, never stored. Fallback /tmp files are ephemeral and auto-deleted." },
              { q: "Max quality?", a: "Up to 4K 2160p when available. We auto-pick best mux. With 'No audio' you get video-only for editing." },
            ].map(f => (
              <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="font-semibold">{f.q}</div><div className="mt-1 text-sm leading-6 text-white/60">{f.a}</div></div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative mt-16 border-t border-white/5 bg-black/20 backdrop-blur">
        <div className="mx-auto max-w-[1180px] px-6 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white text-black"><Download size={14} /></div>
              <span className="font-display font-bold">ClipVault</span><span className="text-xs text-white/30">© 2026 • Respect creators’ rights. Only download content you own or have permission for.</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/50">
              <a href="/deploy" className="inline-flex items-center gap-1 hover:text-white"><BookOpen size={14} /> Hosting guide</a>
              <a href="https://github.com" target="_blank" className="inline-flex items-center gap-1 hover:text-white"><GitBranch size={14} /> GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
