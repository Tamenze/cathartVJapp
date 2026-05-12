"use client";

import { useState, useEffect, useCallback } from "react";

// Light mode overrides applied directly to documentElement.style (highest cascade priority).
// Stone scale is inverted. Accent colors shift two steps deeper for legibility on light backgrounds.
const LIGHT_VARS: [string, string][] = [
  // Stone — inverted
  ["--color-stone-50",  "oklch(14.7% 0.004 49.25)"],
  ["--color-stone-100", "oklch(21.6% 0.006 56.043)"],
  ["--color-stone-200", "oklch(26.8% 0.007 34.298)"],
  ["--color-stone-300", "oklch(37.4% 0.01 67.558)"],
  ["--color-stone-400", "oklch(44.4% 0.011 73.639)"],
  ["--color-stone-500", "oklch(55.3% 0.013 58.071)"],
  ["--color-stone-600", "oklch(70.9% 0.01 56.259)"],
  ["--color-stone-700", "oklch(86.9% 0.005 56.366)"],
  ["--color-stone-800", "oklch(92.3% 0.003 48.717)"],
  ["--color-stone-900", "oklch(97% 0.001 106.424)"],
  ["--color-stone-950", "oklch(98.5% 0.001 106.423)"],
  // Accents — shifted deeper so text is readable on a light background
  ["--color-teal-400",    "oklch(51.1% 0.096 186.391)"],  // teal-700
  ["--color-teal-500",    "oklch(44.4% 0.08 187)"],       // teal-800 approx
  ["--color-violet-400",  "oklch(49.1% 0.27 292.581)"],   // violet-700
  ["--color-violet-500",  "oklch(43% 0.25 293)"],         // violet-800 approx
  ["--color-amber-400",   "oklch(55.5% 0.163 48.998)"],   // amber-700
  ["--color-rose-400",    "oklch(51.4% 0.222 16.935)"],   // rose-700
  ["--color-emerald-400", "oklch(50.8% 0.118 165.612)"],  // emerald-700
  ["--color-sky-400",     "oklch(50% 0.134 242.749)"],    // sky-700
  ["--color-red-400",     "oklch(50.5% 0.213 27.518)"],   // red-700
  // Base background / foreground
  ["--background", "oklch(98.5% 0.001 106.423)"],
  ["--foreground", "oklch(14.7% 0.004 49.25)"],
];

function applyLight(el: HTMLElement) {
  LIGHT_VARS.forEach(([k, v]) => el.style.setProperty(k, v));
}
function clearLight(el: HTMLElement) {
  LIGHT_VARS.forEach(([k]) => el.style.removeProperty(k));
}

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    if (isLight) applyLight(document.documentElement);
    setLight(isLight);
  }, []);

  const toggle = useCallback(() => {
    const html = document.documentElement;
    const nextLight = !html.classList.contains("light");
    html.classList.toggle("light", nextLight);
    if (nextLight) {
      applyLight(html);
    } else {
      clearLight(html);
    }
    try { localStorage.setItem("cathart-theme", nextLight ? "light" : "dark"); } catch { /* private browsing */ }
    setLight(nextLight);
  }, []);

  return (
    <button
      onClick={toggle}
      className="text-stone-500 hover:text-stone-300 transition-colors p-1 rounded-md"
      aria-label="Toggle theme"
    >
      {light ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
    </svg>
  );
}
