"use client";
import { useState } from "react";
import { Copy, Check, ExternalLink, Terminal, Globe, ShieldCheck, Clock3, AlertTriangle, Settings, Cloud, Box, GitBranch, ArrowRight } from "lucide-react";

function Code({ children, id }: { children: string; id?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0f]">
      <pre className="overflow-x-auto p-4 text-xs leading-5 text-white/90"><code>{children}</code></pre>
      <button onClick={copy} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-black hover:bg-white/90">
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-black">{n}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold">{title}</h3>
          <div className="mt-3 text-sm leading-6 text-white/70">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function DeployClient() {
  const [tab, setTab] = useState<"vercel" | "railway" | "domain">("vercel");

  return (
    <div className="mx-auto mt-10 max-w-4xl">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur">
        {[
          { id: "vercel", label: "Vercel (1-click)", icon: Cloud },
          { id: "railway", label: "Railway / Render (YouTube unblocked)", icon: Box },
          { id: "domain", label: "Custom domain", icon: Globe },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "bg-white text-black shadow" : "text-white/60 hover:text-white"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Vercel */}
      {tab === "vercel" && (
        <div className="mt-6 space-y-4">
          <Step n="1" title="Push this code to GitHub">
            <p>Click <b className="text-white">Use this template</b> or create a new GitHub repo and push this project. Vercel imports directly from GitHub.</p>
            <div className="mt-3 space-y-2">
              <Code>{`# in your project folder
git init
git add .
git commit -m "init clipvault"
git branch -M main
git remote add origin https://github.com/YOURNAME/clipvault.git
git push -u origin main`}</Code>
              <p className="text-xs text-white/40">Or use GitHub Desktop → Add local repo → Publish.</p>
            </div>
          </Step>

          <Step n="2" title="Import to Vercel (free, no card)">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Go to <a href="https://vercel.com/new" target="_blank" className="inline-flex items-center gap-1 font-semibold text-violet-300 hover:underline">vercel.com/new <ExternalLink size={12} /></a> → Login with GitHub.</li>
              <li>Pick your <b className="text-white">clipvault</b> repo → Click <b className="text-white">Import</b>.</li>
              <li>Leave Framework: <b className="text-white">Next.js</b>. Build command auto: <code className="rounded bg-white/10 px-1">next build</code>.</li>
              <li>No env needed for basic. Optional: add <code className="rounded bg-white/10 px-1">YTDLP_COOKIES</code> to fix YouTube blocks (see note).</li>
              <li>Hit <b className="text-white">Deploy</b> — live in ~60s at <code className="rounded bg-white/10 px-1">your-app.vercel.app</code>.</li>
            </ol>
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-200">
              <b>Tip:</b> Enable “Automatic deployments” — every <code className="rounded bg-black/20 px-1">git push</code> redeploys.
            </div>
          </Step>

          <Step n="3" title="Add custom domain (free)">
            <ol className="list-decimal space-y-2 pl-5">
              <li>In Vercel → your project → <b className="text-white">Settings → Domains</b> → Add domain: <code className="rounded bg-white/10 px-1">video.yourdomain.com</code></li>
              <li>Vercel shows DNS records. Go to your registrar (Namecheap, Cloudflare, GoDaddy) → DNS → Add:</li>
            </ol>
            <div className="mt-3">
              <Code>{`Type: CNAME
Name: video   (or @ for root)
Value: cname.vercel-dns.com
TTL: Auto`}</Code>
            </div>
            <p className="mt-2 text-xs text-white/50">Cloudflare: set proxy to <b className="text-white">DNS only (grey cloud)</b> first, then enable after verified. Wait 1–5 min → SSL auto.</p>
          </Step>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex gap-2 text-sm font-bold text-amber-200"><AlertTriangle size={16} /> YouTube blocked? Normal on Vercel free.</div>
            <p className="mt-1 text-sm leading-6 text-amber-100/70">Vercel uses datacenter IPs → YouTube returns “Sign in to confirm you’re not a bot”. Instagram/TikTok still often work. Fix: Option B (Railway) or add cookies.</p>
            <div className="mt-3">
              <Code>{`# Export YouTube cookies (in your browser, logged in):
# 1) Install extension: "Get cookies.txt LOCALLY"
# 2) Open youtube.com → export → copy content
# In Vercel → Settings → Environment Variables:
# Key: YTDLP_COOKIES
# Value: <paste cookies.txt content>
# Redeploy`}</Code>
            </div>
          </div>
        </div>
      )}

      {tab === "railway" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white p-5 text-black">
            <h3 className="font-bold">Why Railway/Render for YouTube?</h3>
            <p className="mt-1 text-sm leading-6 text-black/60">They run a real container with <code className="rounded bg-black/5 px-1">yt-dlp + ffmpeg</code> and give you a non-datacenter IP → YouTube not blocked. Free tier is enough for personal use.</p>
          </div>

          <Step n="1" title="One-click Docker deploy">
            <p>Railway supports <code className="rounded bg-white/10 px-1">Dockerfile</code> (already included). No config needed.</p>
            <Code>{`# Dockerfile is in your repo — Railway auto-detects it
# Or deploy via CLI:
npm i -g @railway/cli
railway login
railway init
railway up`}</Code>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="https://railway.app/new" target="_blank" className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-white">Railway.app/new <ExternalLink size={12} /></a>
              <a href="https://render.com" target="_blank" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Render.com <ExternalLink size={12} /></a>
            </div>
            <p className="mt-2 text-xs text-white/40">Railway: New Project → Deploy from GitHub → Select repo → Deploys. Add custom domain in Settings → Domains.</p>
          </Step>

          <Step n="2" title="Dockerfile (already included)">
            <Code>{`FROM node:20-bullseye
RUN pip3 install --break-system-packages yt-dlp && \\
    apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm","start"]`}</Code>
            <p className="mt-2 text-xs text-white/50">This image bundles yt-dlp + ffmpeg so downloads are merged server-side (MP4). No cookies needed for most TikToks.</p>
          </Step>

          <Step n="3" title="Env & settings">
            <ul className="list-disc space-y-1 pl-5">
              <li>No DB required — ClipVault uses <code className="rounded bg-white/10 px-1">/tmp</code> JSON.</li>
              <li>Optional: <code className="rounded bg-white/10 px-1">YTDLP_COOKIES</code> for YouTube age-restricted.</li>
              <li>Set <code className="rounded bg-white/10 px-1">PORT=3000</code> if platform needs it.</li>
            </ul>
          </Step>
        </div>
      )}

      {tab === "domain" && (
        <div className="mt-6 space-y-4">
          <Step n="1" title="Buy (or use free) domain">
            <ul className="list-disc space-y-1 pl-5">
              <li><b className="text-white">Paid (recommended):</b> Namecheap (~$8/yr for .com), Cloudflare Registrar (at-cost), Google Domains. Best for custom like <code className="rounded bg-white/10 px-1">clipvault.app</code>.</li>
              <li><b className="text-white">Free:</b> <a href="https://www.freenom.com" target="_blank" className="text-violet-300 underline">Freenom</a> (.tk/.ml/.ga) or use subdomain: <code className="rounded bg-white/10 px-1">yourname.vercel.app</code> free forever.</li>
            </ul>
          </Step>

          <Step n="2" title="Connect domain → Vercel (easiest)">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Vercel → Project → Settings → Domains → Add: <code className="rounded bg-white/10 px-1">yourdomain.com</code> and <code className="rounded bg-white/10 px-1">www.yourdomain.com</code></li>
              <li>Choose registrar:
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl bg-black/20 p-3"><b className="text-white">Cloudflare</b><br /><span className="text-xs">Add CNAME `cname.vercel-dns.com` → Grey cloud first → Vercel verifies → Turn orange cloud on.</span></div>
                  <div className="rounded-xl bg-black/20 p-3"><b className="text-white">Namecheap / GoDaddy</b><br /><span className="text-xs">Advanced DNS → CNAME `cname.vercel-dns.com` or A `76.76.21.21`.</span></div>
                </div>
              </li>
              <li>Wait 1–5 min → Vercel auto-issues SSL (Let’s Encrypt). Done.</li>
            </ol>
          </Step>

          <Step n="3" title="Cloudflare extra (free CDN + protection)">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Add site to <a href="https://dash.cloudflare.com" target="_blank" className="text-violet-300 underline">dash.cloudflare.com</a> → Change nameservers to Cloudflare’s.</li>
              <li>DNS → Add CNAME to Vercel. Turn proxy <b className="text-white">ON (orange)</b> for CDN.</li>
              <li>SSL → Flexible or Full. Enable <b className="text-white">Auto HTTPS</b>.</li>
            </ol>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/60">
              <b className="text-white">Subdomain tip:</b> Want <code className="rounded bg-white/10 px-1">video.yourdomain.com</code>? Just add CNAME name=<code className="rounded bg-white/10 px-1">video</code> value=<code className="rounded bg-white/10 px-1">cname.vercel-dns.com</code>. No extra purchase.
            </div>
          </Step>

          <Step n="4" title="Verify & share">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300"><ShieldCheck size={12} /> HTTPS auto</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"><Clock3 size={12} /> 2–5 min propagate</span>
            </div>
            <p className="mt-2 text-xs text-white/50">Test: <code className="rounded bg-white/10 px-1">https://video.yourdomain.com</code> → should show ClipVault. If not, check DNS propagation at <a href="https://dnschecker.org" target="_blank" className="underline">dnschecker.org</a>.</p>
          </Step>
        </div>
      )}

      {/* Bottom checklist */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="flex items-center gap-2 font-bold"><Settings size={16} /> Final checklist</h3>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          <li className="flex items-start gap-2"><Check size={14} className="mt-1 text-emerald-400" /> GitHub repo is public (or connect private repo in Vercel).</li>
          <li className="flex items-start gap-2"><Check size={14} className="mt-1 text-emerald-400" /> Build succeeds locally: <code className="rounded bg-white/10 px-1">npm run build</code></li>
          <li className="flex items-start gap-2"><Check size={14} className="mt-1 text-emerald-400" /> Domain DNS uses CNAME <code className="rounded bg-white/10 px-1">cname.vercel-dns.com</code> (not old `vercel.app` IP).</li>
          <li className="flex items-start gap-2"><Check size={14} className="mt-1 text-emerald-400" /> On Cloudflare, start with grey cloud, then orange after Vercel verifies.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">Back to downloader <ArrowRight size={14} /></a>
          <a href="https://vercel.com/new" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white">Go to Vercel <ExternalLink size={14} /></a>
        </div>
      </div>
    </div>
  );
}
