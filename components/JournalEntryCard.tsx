"use client";

import { useState, useCallback } from "react";
import type { JournalEntry } from "@/types";

interface Props {
  entry: JournalEntry;
  onDelete?: () => void;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// All class strings spelled out fully so Tailwind's scanner includes them in the bundle
const CATEGORY_STYLE: Record<string, { iconActive: string; iconHover: string }> = {
  question:   { iconActive: "text-violet-400", iconHover: "group-hover:text-violet-400"  },
  feeling:    { iconActive: "text-rose-400",   iconHover: "group-hover:text-rose-400"    },
  memory:     { iconActive: "text-amber-400",  iconHover: "group-hover:text-amber-400"   },
  plan:       { iconActive: "text-teal-400",   iconHover: "group-hover:text-teal-400"    },
  creative:   { iconActive: "text-emerald-400",iconHover: "group-hover:text-emerald-400" },
  gratitude:  { iconActive: "text-yellow-400", iconHover: "group-hover:text-yellow-400"  },
  reflection: { iconActive: "text-sky-400",    iconHover: "group-hover:text-sky-400"     },
};
const DEFAULT_STYLE = { iconActive: "text-sky-400", iconHover: "group-hover:text-sky-400" };

function getCategoryStyle(category?: string) {
  return (category && CATEGORY_STYLE[category]) ? CATEGORY_STYLE[category] : DEFAULT_STYLE;
}

function CategoryIcon({ category, expanded, activeClass, hoverClass }: {
  category?: string;
  expanded: boolean;
  activeClass: string;
  hoverClass: string;
}) {
  const cls = `w-7 h-7 transition-colors duration-200 ${expanded ? activeClass : `text-stone-400 ${hoverClass}`}`;

  switch (category) {
    case "question":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-.6 3.819.722a2.25 2.25 0 01-1.94 3.508c-.569 0-.879.501-.879 1.027v.5M12 17.25h.007" />
        </svg>
      );
    case "feeling":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      );
    case "memory":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "plan":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "creative":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
      );
    case "gratitude":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      );
  }
}

function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="text-stone-500 hover:text-stone-300 transition-colors"
      aria-label={label}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.337c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
        </svg>
      )}
    </button>
  );
}

export function JournalEntryCard({ entry, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actionItems = entry.reflection.actionItems ?? [];
  const suggestions = entry.reflection.suggestions ?? [];
  const dateStr = formatDate(entry.createdAt);
  const allActionItems = `${dateStr} — You brought up\n${actionItems.map((i) => `– ${i}`).join("\n")}`;
  const allSuggestions = `${dateStr} — Worth trying\n${suggestions.map((s) => `– ${s}`).join("\n")}`;
  const catStyle = getCategoryStyle(entry.reflection.category);

  return (
    <div className="rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Category icon — click to expand; group enables hover color via child class */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="group flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5"
          aria-label={expanded ? "Collapse entry" : "Expand entry"}
        >
          <CategoryIcon
            category={entry.reflection.category}
            expanded={expanded}
            activeClass={catStyle.iconActive}
            hoverClass={catStyle.iconHover}
          />
          <svg
            className={[
              "w-3 h-3 transition-transform duration-200",
              expanded ? catStyle.iconActive + " rotate-180" : "text-stone-500 group-hover:text-stone-400",
            ].join(" ")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Summary + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-stone-200 text-sm leading-snug line-clamp-2 capitalize">
            {entry.reflection.summary}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-stone-300 text-xs">{formatDate(entry.createdAt)}</span>
            <span className="text-stone-600 text-xs">|</span>
            <span className="text-stone-400 text-xs">{formatTime(entry.createdAt)}</span>
            <span className="text-stone-700 text-xs">·</span>
            <span className="text-stone-400 text-xs">{formatDuration(entry.durationSeconds)}</span>
          </div>
        </div>

        {/* Delete */}
        {onDelete && (
          <button
            onClick={() => setConfirmDelete((v) => !v)}
            className="flex-shrink-0 text-stone-500 hover:text-stone-300 transition-colors pt-0.5"
            aria-label="Delete entry"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirmDelete && (
        <div className="px-4 py-3 border-t border-stone-800 flex items-center justify-between">
          <p className="text-stone-400 text-xs">Delete this entry? This cannot be undone.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setConfirmDelete(false); onDelete?.(); }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-stone-800 pt-4">
          {/* Response — most prominent */}
          <section>
            <p className="text-stone-200 text-sm leading-relaxed">{entry.reflection.response}</p>
          </section>

          {/* Action items — extracted from user's own words */}
          {actionItems.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-stone-400 text-xs uppercase tracking-widest">You brought up</h3>
                <CopyButton text={allActionItems} label="Copy all" />
              </div>
              <ul className="space-y-1.5">
                {actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-200">
                    <span className="text-stone-500 mt-0.5 select-none">–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {suggestions.length > 0 && (
            <div className="pt-3 border-t border-stone-800">
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-stone-400 text-xs uppercase tracking-widest">Worth trying</h3>
                  <CopyButton text={allSuggestions} label="Copy all suggestions" />
                </div>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-300 leading-snug">
                      <span className="text-stone-500 mt-0.5 select-none">–</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {/* Transcript — collapsed by default, lowest priority */}
          <section className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-stone-400 text-xs uppercase tracking-widest">What you said</h3>
              <button
                onClick={() => setTranscriptExpanded((v) => !v)}
                className="text-stone-500 text-xs hover:text-stone-300 transition-colors"
              >
                {transcriptExpanded ? "collapse" : "expand"}
              </button>
            </div>
            <p
              className={[
                "text-stone-400 text-sm leading-relaxed",
                transcriptExpanded ? "" : "line-clamp-2",
              ].join(" ")}
            >
              {entry.transcript}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
