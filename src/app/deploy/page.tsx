import Link from "next/link";
import { ArrowLeft, GitBranch, Globe, Rocket, Cloud, Copy, Check, ExternalLink, Clock3, ShieldCheck, Box, Terminal, Settings, AlertTriangle, Sparkles, Download } from "lucide-react";
import DeployClient from "./deploy-client";

export const metadata = {
  title: "Deploy ClipVault Free — Custom Domain Guide | Vercel, Railway, Cloudflare",
  description: "Host ClipVault free with your own domain. Step-by-step for Vercel, Railway, Render + custom domain via Cloudflare in 5 minutes.",
};

export default function DeployPage() {
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white text-black"><Download size={18} strokeWidth={2.5} /></div>
            <span className="font-display text-[18px] font-bold tracking-tight">ClipVault</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white/60">DEPLOY GUIDE</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white"><ArrowLeft size={14} /> Back to app</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-8">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
            <Rocket size={12} /> 100% Free • No credit card for Vercel • Custom domain in 5 min
          </div>
          <h1 className="font-display mt-4 text-[32px] font-extrabold leading-[0.95] tracking-tight md:text-[48px]">
            Host ClipVault free<br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">with your own domain</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[640px] text-sm leading-6 text-white/60">
            Two options. <b className="text-white">Vercel</b> is easiest (1-click, free). <b className="text-white">Railway / Render</b> gives full YouTube support (own IP, not blocked). Both support custom domains.
          </p>
        </div>

        {/* Quick pick */}
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white p-5 text-black">
            <div className="inline-flex items-center gap-2 rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white"><Cloud size={12} /> Recommended start</div>
            <h3 className="mt-3 text-lg font-bold">Option A — Vercel</h3>
            <p className="mt-1 text-sm leading-6 text-black/60">Fastest. Push to GitHub → Import → Done. Free forever. Works for TikTok/IG. YouTube may show “blocked” (Vercel IP) — see fix below.</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs"><span className="rounded-full bg-black/5 px-2 py-1">1-click</span><span className="rounded-full bg-black/5 px-2 py-1">Free</span><span className="rounded-full bg-black/5 px-2 py-1">Custom domain</span></div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-bold text-white"><Box size={12} /> Full YouTube</div>
            <h3 className="mt-3 text-lg font-bold">Option B — Railway / Render</h3>
            <p className="mt-1 text-sm leading-6 text-white/60">Docker + yt-dlp + ffmpeg. Own IP → YouTube not blocked. Free tier ($5 credit). Same custom domain flow.</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs"><span className="rounded-full bg-white/10 px-2 py-1">Docker</span><span className="rounded-full bg-white/10 px-2 py-1">Unblocked</span><span className="rounded-full bg-white/10 px-2 py-1">4K</span></div>
          </div>
        </div>

        <DeployClient />
      </main>

      <footer className="border-t border-white/5 bg-black/20 py-8 text-center text-xs text-white/30">
        ClipVault • Open guide • Questions? Open an issue on GitHub • Not affiliated with YouTube / TikTok / Instagram
      </footer>
    </div>
  );
}
