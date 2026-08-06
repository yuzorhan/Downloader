import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ClipVault — Download YouTube, TikTok & Instagram Videos | 4K, No Watermark",
  description: "Paste any YouTube, Shorts, Instagram Reels or TikTok link. Choose quality & audio. Download instantly — free, fast, no watermark. Modern, privacy-first downloader.",
  keywords: ["youtube downloader", "tiktok downloader", "instagram reels download", "youtube shorts download", "4k downloader", "no watermark"],
  openGraph: {
    title: "ClipVault — Universal Video Downloader",
    description: "YouTube, TikTok, Instagram in one place. 4K, MP4, no watermark.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-[#050507] text-white antialiased selection:bg-violet-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
