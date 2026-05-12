import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cathart - A private voice journal",
  description: "A privacy-first AI voice journaling app. Record your thoughts, get AI reflection, and keep everything on your device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before React hydrates — sets .light class AND inline CSS vars synchronously to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('cathart-theme')||(window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');if(t==='light'){var d=document.documentElement;d.classList.add('light');var v=[['--color-stone-50','oklch(14.7% 0.004 49.25)'],['--color-stone-100','oklch(21.6% 0.006 56.043)'],['--color-stone-200','oklch(26.8% 0.007 34.298)'],['--color-stone-300','oklch(37.4% 0.01 67.558)'],['--color-stone-400','oklch(44.4% 0.011 73.639)'],['--color-stone-500','oklch(55.3% 0.013 58.071)'],['--color-stone-600','oklch(70.9% 0.01 56.259)'],['--color-stone-700','oklch(86.9% 0.005 56.366)'],['--color-stone-800','oklch(92.3% 0.003 48.717)'],['--color-stone-900','oklch(97% 0.001 106.424)'],['--color-stone-950','oklch(98.5% 0.001 106.423)'],['--color-teal-400','oklch(51.1% 0.096 186.391)'],['--color-teal-500','oklch(44.4% 0.08 187)'],['--color-violet-400','oklch(49.1% 0.27 292.581)'],['--color-violet-500','oklch(43% 0.25 293)'],['--color-amber-400','oklch(55.5% 0.163 48.998)'],['--color-rose-400','oklch(51.4% 0.222 16.935)'],['--color-emerald-400','oklch(50.8% 0.118 165.612)'],['--color-sky-400','oklch(50% 0.134 242.749)'],['--color-red-400','oklch(50.5% 0.213 27.518)'],['--background','oklch(98.5% 0.001 106.423)'],['--foreground','oklch(14.7% 0.004 49.25)']];v.forEach(function(p){d.style.setProperty(p[0],p[1]);});}}catch(e){}})()` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
