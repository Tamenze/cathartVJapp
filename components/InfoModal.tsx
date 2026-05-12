"use client";

import { useEffect } from "react";

function getMidnightUTCLocal(): string {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0
  ));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(midnight);
}

interface Props {
  onClose: () => void;
}

export function InfoModal({ onClose }: Props) {
  const resetTime = getMidnightUTCLocal();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-800 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-100 text-base">Your privacy</h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="space-y-3 text-sm text-stone-300 leading-relaxed">
          <li className="flex gap-2.5">
            <span className="text-teal-400 mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span>All journal entries are stored <strong className="text-stone-100">only on this device</strong> using your browser&apos;s local database.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-teal-400 mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span>Your audio is sent to a transcription service to convert speech to text, then <strong className="text-stone-100">immediately discarded</strong> — it is never stored.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-teal-400 mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span>Your transcript is sent to an AI for reflection, then discarded. Only your saved entry (stored locally) contains the result.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-teal-400 mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span>No account is required. No login.</span>
          </li>
        </ul>

        <div className="pt-1 border-t border-stone-800 text-xs text-stone-500 space-y-1">
          <p>
            Your daily reflection time (20 min) resets at midnight UTC —{" "}
            <span className="text-stone-400">{resetTime}</span> in your current timezone.
          </p>
          <p>Only time that you actually submit counts toward your limit. Discarded recordings are free.</p>
        </div>
      </div>
    </div>
  );
}
