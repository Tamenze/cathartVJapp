"use client";

import { useMemo, useState, useEffect } from "react";
import { computeWordFrequencies, sinceDate } from "@/lib/wordcloud";
import type { JournalEntry } from "@/types";
import type { WordFrequency } from "@/lib/wordcloud";

type Range = 7 | 30 | 90;

interface Props {
  entries: JournalEntry[];
  onWordClick?: (word: string) => void;
  selectedWord?: string | null;
}

const RANGE_LABELS: Record<Range, string> = {
  7: "7 days",
  30: "30 days",
  90: "90 days",
};

const W = 440;
const H = 270;
const CHAR_W = 0.58;
const PAD = 5;

const PALETTE_DARK  = ["#5eead4", "#a78bfa", "#fb7185", "#60a5fa", "#34d399", "#fbbf24"];
const PALETTE_LIGHT = ["#0f766e", "#6d28d9", "#be123c", "#1d4ed8", "#047857", "#92400e"];

interface PlacedWord {
  word: string;
  cx: number;
  cy: number;
  size: number;
  rotate: 0 | 90 | -90;
  color: string;
  opacity: number;
  bold: boolean;
}

function wordHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function placeWords(words: WordFrequency[], palette: string[]): PlacedWord[] {
  const result: PlacedWord[] = [];
  const boxes: { x: number; y: number; w: number; h: number }[] = [];

  const minCount = words.at(-1)?.count ?? 1;
  const maxCount = words.at(0)?.count ?? 1;

  for (let i = 0; i < words.length; i++) {
    const { word, count } = words[i];
    const t = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount);
    const size = Math.round(13 + t * 36);

    const h = wordHash(word);
    const rotate: 0 | 90 | -90 = h % 4 === 0 ? (h % 8 === 0 ? 90 : -90) : 0;

    const rawW = size * CHAR_W * word.length;
    const rawH = size * 1.35;
    const textW = rotate === 0 ? rawW : rawH;
    const textH = rotate === 0 ? rawH : rawW;

    const color =
      t > 0.72 ? palette[0]
      : t > 0.44 ? palette[1]
      : palette[i % palette.length];

    // Minimum opacity raised to 0.60 for readability (WCAG)
    const opacity = 0.60 + t * 0.40;

    let placed = false;
    for (let step = 0; step < 800 && !placed; step++) {
      const angle = step * 0.28;
      const r = step * 1.1;
      const cx = W / 2 + r * Math.cos(angle);
      const cy = H / 2 + r * Math.sin(angle) * 0.62;
      const bx = cx - textW / 2;
      const by = cy - textH / 2;

      if (bx < PAD || by < PAD || bx + textW > W - PAD || by + textH > H - PAD) continue;

      const overlaps = boxes.some(
        (b) =>
          bx < b.x + b.w + PAD &&
          bx + textW + PAD > b.x &&
          by < b.y + b.h + PAD &&
          by + textH + PAD > b.y
      );

      if (!overlaps) {
        boxes.push({ x: bx, y: by, w: textW, h: textH });
        result.push({ word, cx, cy, size, rotate, color, opacity, bold: t > 0.5 });
        placed = true;
      }
    }
  }

  return result;
}

function useIsLight(): boolean {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => {
      setLight(document.documentElement.classList.contains("light"));
    });
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return light;
}

export function WordCloud({ entries, onWordClick, selectedWord }: Props) {
  const [range, setRange] = useState<Range>(30);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const isLight = useIsLight();

  // Only show ranges where there are entries older than the previous threshold
  const availableRanges = useMemo<Range[]>(() => {
    const ranges: Range[] = [7];
    if (entries.some((e) => new Date(e.createdAt) < sinceDate(7))) ranges.push(30);
    if (entries.some((e) => new Date(e.createdAt) < sinceDate(30))) ranges.push(90);
    return ranges;
  }, [entries]);

  // If the selected range is no longer available, clamp to the largest available
  useEffect(() => {
    if (!availableRanges.includes(range)) {
      setRange(availableRanges[availableRanges.length - 1]);
    }
  }, [availableRanges, range]);

  const words = useMemo(
    () => computeWordFrequencies(entries, sinceDate(range), entries.length < 3 ? 10 : 20),
    [entries, range]
  );

  const placed = useMemo(
    () => placeWords(words, isLight ? PALETTE_LIGHT : PALETTE_DARK),
    [words, isLight]
  );

  const inRange = entries.filter((e) => new Date(e.createdAt) >= sinceDate(range)).length;

  return (
    <div className="space-y-3">
      {/* Range selector — only shows options with entries beyond the previous threshold */}
      {availableRanges.length > 1 && (
        <div className="flex items-center gap-1">
          {availableRanges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={[
                "px-3 py-1 rounded-full text-xs transition-colors",
                range === r
                  ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
                  : "text-stone-400 hover:text-stone-200 border border-transparent",
              ].join(" ")}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      )}


      {/* Cloud */}
      {placed.length === 0 ? (
        <p className="text-stone-400 text-sm py-6 text-center">
          No entries in the last {range} days.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          aria-label="Word cloud of your journal entries — click a word to filter entries"
          role="img"
          style={{ overflow: "visible" }}
        >
          {placed.map(({ word, cx, cy, size, rotate, color, opacity, bold }) => {
            const isSelected = selectedWord === word;
            const isHovered = hoveredWord === word;
            // When a word is selected, dim all others; hovered word goes full opacity
            const finalOpacity = selectedWord
              ? (isSelected ? 1.0 : opacity * 0.22)
              : (isHovered ? 1.0 : opacity);

            return (
              <text
                key={word}
                x={cx}
                y={cy}
                fontSize={isSelected ? size * 1.05 : size}
                fill={color}
                fillOpacity={finalOpacity}
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight={bold || isSelected ? 600 : 400}
                fontFamily="var(--font-geist-sans), system-ui, sans-serif"
                transform={rotate !== 0 ? `rotate(${rotate}, ${cx}, ${cy})` : undefined}
                onClick={() => onWordClick?.(word)}
                onMouseEnter={() => setHoveredWord(word)}
                onMouseLeave={() => setHoveredWord(null)}
                style={{ cursor: onWordClick ? "pointer" : "default", transition: "fill-opacity 0.15s, font-size 0.1s" }}
                aria-label={`${word}, mentioned ${words.find((w) => w.word === word)?.count ?? 1} times`}
              >
                <title>{`${word} (${words.find((w) => w.word === word)?.count ?? 1}×) — click to filter entries`}</title>
                {word}
              </text>
            );
          })}
        </svg>
      )}

      <p className="text-stone-500 text-xs">
        {placed.length} words · {inRange} {inRange === 1 ? "entry" : "entries"}
        {selectedWord && (
          <> · <span className="text-teal-400">filtering by &ldquo;{selectedWord}&rdquo;</span></>
        )}
      </p>
    </div>
  );
}
