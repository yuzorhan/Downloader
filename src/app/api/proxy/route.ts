import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

  // Only allow googlevideo, tiktok, instagram CDN hosts
  try {
    const u = new URL(url);
    const allowed = [
      'googlevideo.com',
      'tiktok.com',
      'tiktokcdn.com',
      'muscdn.com',
      'instagram.com',
      'fbcdn.net',
      'cdninstagram.com',
    ];
    const host = u.hostname;
    if (!allowed.some((d) => host.includes(d))) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Range: req.headers.get('range') || 'bytes=0-',
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
    }

    const headers: Record<string, string> = {};
    const pass = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
    for (const h of pass) {
      const v = upstream.headers.get(h);
      if (v) headers[h] = v;
    }
    headers['Content-Disposition'] = `attachment; filename="video.mp4"`;

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Proxy error' }, { status: 500 });
  }
}
