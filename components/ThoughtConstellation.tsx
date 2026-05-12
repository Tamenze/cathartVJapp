// ═══════════════════════════════════════════════════════════════
// [EXPERIMENTAL] ThoughtConstellation
// Visualizes recurring psychological/emotional concepts extracted
// from journal entries as a floating node constellation.
//
// Feature flag: CONSTELLATION_ENABLED = false to hide entirely.
// Rollback: remove import + <ThoughtConstellation> from page.tsx
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { JournalEntry } from "@/types";
import { JournalEntryCard } from "@/components/JournalEntryCard";

// [EXPERIMENTAL] Master switch
const CONSTELLATION_ENABLED = true;

// [EXPERIMENTAL] Min entries before attempting concept extraction
const MIN_ENTRIES = 3;

// [EXPERIMENTAL] Bump this string to invalidate all cached concepts
const CACHE_VERSION = "v2";

// [EXPERIMENTAL] Concept node as returned by /api/concepts
interface ConceptNode {
  id: string;
  label: string;
  description: string;
  frequency: number;
  entryIds: number[];
  relatedIds: string[];
}

// [EXPERIMENTAL] Node with computed visual properties
interface PlacedNode extends ConceptNode {
  x: number;
  y: number;
  r: number;
  color: string;
  floatClass: string;
}

const W = 560;
const H = 420;

// [EXPERIMENTAL] Palette matches app word cloud palette
const PALETTE = [
  "#5eead4", // teal
  "#a78bfa", // violet
  "#fb7185", // rose
  "#60a5fa", // sky
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f472b6", // pink
  "#c084fc", // purple
];

// [EXPERIMENTAL] CSS float keyframes — pure CSS, injected once
const FLOAT_CSS = `
  @keyframes cf0{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes cf1{0%,100%{transform:translateY(-1px)}50%{transform:translateY(-9px)}}
  @keyframes cf2{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes cf3{0%,100%{transform:translateY(-2px)}50%{transform:translateY(-8px)}}
  @keyframes cf4{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  .cf0{animation:cf0 5.4s ease-in-out infinite}
  .cf1{animation:cf1 6.2s ease-in-out 0.5s infinite}
  .cf2{animation:cf2 4.9s ease-in-out 1.2s infinite}
  .cf3{animation:cf3 5.8s ease-in-out 0.8s infinite}
  .cf4{animation:cf4 6.7s ease-in-out 1.6s infinite}
`;

// [EXPERIMENTAL] Golden-angle spiral layout, most frequent node at center
function computePositions(nodes: ConceptNode[]): PlacedNode[] {
  const sorted = [...nodes].sort((a, b) => b.frequency - a.frequency);

  return sorted.map((node, i) => {
    let x: number, y: number;

    if (i === 0) {
      x = W / 2;
      y = H / 2;
    } else {
      const angle = i * 2.399; // golden angle ≈ 137.5°
      const spiral = 80 + Math.sqrt(i) * 70;
      x = Math.max(84, Math.min(W - 84, W / 2 + spiral * Math.cos(angle)));
      y = Math.max(84, Math.min(H - 84, H / 2 + spiral * Math.sin(angle) * 0.62));
    }

    // Node radius: bigger base, scales with frequency
    const r = 40 + Math.min(node.frequency - 1, 9) * 4;

    return {
      ...node,
      x, y, r,
      color: PALETTE[i % PALETTE.length],
      floatClass: `cf${i % 5}`,
    };
  });
}

// [EXPERIMENTAL] Deduplicated edge list
function buildEdges(nodes: PlacedNode[]): Array<[PlacedNode, PlacedNode]> {
  const posMap = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const edges: Array<[PlacedNode, PlacedNode]> = [];
  for (const node of nodes) {
    for (const relId of node.relatedIds) {
      const key = [node.id, relId].sort().join("--");
      if (!seen.has(key) && posMap.has(relId)) {
        seen.add(key);
        edges.push([node, posMap.get(relId)!]);
      }
    }
  }
  return edges;
}

// [EXPERIMENTAL] localStorage cache helpers
function cacheKey(entries: JournalEntry[]): string {
  const ids = entries.filter((e) => e.id != null).map((e) => e.id).sort().join(",");
  return `cathart_concepts_${CACHE_VERSION}_${ids}`;
}
function readCache(key: string): ConceptNode[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}
function writeCache(key: string, concepts: ConceptNode[]): void {
  try { localStorage.setItem(key, JSON.stringify(concepts)); } catch { /* quota exceeded */ }
}

// ─────────────────────────────────────────────────────────────
// [EXPERIMENTAL] SVG label — splits at spaces and hyphens so
// each word fits within the node circle at a computed font size.
// ─────────────────────────────────────────────────────────────
function NodeLabel({ label, r }: { label: string; r: number }) {
  // Split at spaces and hyphens so no single line overflows the diameter
  const words = label.split(/[\s-]+/).filter(Boolean);
  const maxWordLen = Math.max(...words.map((w) => w.length));
  // Approximate char width = 0.60 * fontSize for this sans-serif weight
  const fontFromWidth  = (2 * r * 0.82) / (maxWordLen * 0.60);
  const fontFromHeight = (2 * r * 0.78) / (words.length * 1.28);
  const fontSize = Math.max(8, Math.min(18, Math.floor(Math.min(fontFromWidth, fontFromHeight))));
  const lineH = fontSize * 1.28;

  const shared = {
    fontSize,
    textAnchor: "middle" as const,
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontWeight: 600,
    style: { pointerEvents: "none" as const, userSelect: "none" as const },
  };

  if (words.length === 1) {
    return (
      <text {...shared} dominantBaseline="middle">
        {words[0]}
      </text>
    );
  }

  const totalH = lineH * words.length;
  return (
    <text {...shared}>
      {words.map((word, i) => (
        <tspan key={i} x="0" y={-totalH / 2 + lineH * i + lineH * 0.5}>
          {word}
        </tspan>
      ))}
    </text>
  );
}

// ─────────────────────────────────────────────────────────────
// [EXPERIMENTAL] Concept detail panel with expandable entries
// ─────────────────────────────────────────────────────────────
function ConceptDetail({
  node,
  entries,
  onClose,
}: {
  node: PlacedNode;
  entries: JournalEntry[];
  onClose: () => void;
}) {
  const linked = useMemo(
    () => entries.filter((e) => e.id != null && node.entryIds.includes(e.id as number)),
    [entries, node.entryIds]
  );

  return (
    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-900/80 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-snug" style={{ color: node.color }}>
            {node.label}
          </h3>
          <p className="text-stone-300 text-sm leading-relaxed mt-1">{node.description}</p>
        </div>
        <button
          onClick={onClose}
          className="text-stone-500 hover:text-stone-300 transition-colors flex-shrink-0 mt-0.5"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {linked.length > 0 && (
        <div className="space-y-2 pt-[10px] border-t border-stone-800">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-2">From your entries</p>
          {linked.map((entry) => (
            <JournalEntryCard
              key={entry.id ?? String(entry.createdAt)}
              entry={entry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// [EXPERIMENTAL] Inner constellation (all hooks live here)
// Separated so the outer component can early-return without
// violating React's rules-of-hooks.
// ─────────────────────────────────────────────────────────────
function ConstellationInner({ entries }: { entries: JournalEntry[] }) {
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchConcepts = useCallback(async () => {
    if (entries.length < MIN_ENTRIES) return;
    const key = cacheKey(entries);
    const cached = readCache(key);
    if (cached && cached.length > 0) { setConcepts(cached); return; }

    setLoading(true);
    setFetchError(false);
    try {
      const payload = entries
        .filter((e) => e.id != null)
        .map((e) => ({
          id: e.id as number,
          summary: e.reflection.summary,
          patterns: e.reflection.patterns ?? [],
        }));

      const res = await window.fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { concepts: ConceptNode[] };
      const result = data.concepts ?? [];
      setConcepts(result);
      writeCache(key, result);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [entries]);

  useEffect(() => {
    fetchConcepts();
    setSelectedId(null);
  }, [fetchConcepts]);

  const placed = useMemo(() => computePositions(concepts), [concepts]);
  const edges = useMemo(() => buildEdges(placed), [placed]);
  const posMap = useMemo(() => new Map(placed.map((n) => [n.id, n])), [placed]);
  const selectedNode = placed.find((n) => n.id === selectedId) ?? null;

  if (entries.length < MIN_ENTRIES) {
    return (
      <p className="text-stone-600 text-sm text-center py-8">
        Add at least {MIN_ENTRIES} entries to reveal thought patterns.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-stone-600 animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 rounded-full bg-stone-600 animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 rounded-full bg-stone-600 animate-bounce" />
      </div>
    );
  }

  if (fetchError || concepts.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-stone-500 text-sm">
          {fetchError ? "Couldn't extract patterns right now." : "No recurring patterns found yet."}
        </p>
        {fetchError && (
          <button onClick={fetchConcepts} className="text-teal-500 text-xs hover:text-teal-400 transition-colors">
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <style>{FLOAT_CSS}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Thought constellation — recurring patterns from your journal"
        role="img"
        style={{ overflow: "visible" }}
      >
        {/* [EXPERIMENTAL] Connecting lines — drawn first, behind nodes */}
        {edges.map(([a, b], i) => {
          const lit = hoveredId === a.id || hoveredId === b.id
                    || selectedId === a.id || selectedId === b.id;
          return (
            <line key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={lit ? a.color : "#44403c"}
              strokeOpacity={lit ? 0.5 : 0.2}
              strokeWidth={lit ? 1 : 0.5}
              style={{ transition: "stroke-opacity 0.2s, stroke-width 0.2s" }}
            />
          );
        })}

        {/* [EXPERIMENTAL] Nodes */}
        {placed.map((node) => {
          const isHovered  = hoveredId === node.id;
          const isSelected = selectedId === node.id;
          const isRelated  = (hoveredId  !== null && posMap.get(hoveredId)?.relatedIds.includes(node.id))
                           || (selectedId !== null && posMap.get(selectedId)?.relatedIds.includes(node.id));
          const isDimmed   = (hoveredId !== null || selectedId !== null)
                           && !isHovered && !isSelected && !isRelated;

          const fillOpacity   = isDimmed ? 0.10 : isSelected ? 0.32 : isHovered ? 0.25 : 0.16;
          const strokeOpacity = isDimmed ? 0.18 : isSelected ? 0.95 : isHovered ? 0.80 : 0.50;
          const labelOpacity  = isDimmed ? 0.20 : 1;

          return (
            // Outer <g>: SVG position (transform attribute, not animated)
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              {/* Inner <g>: CSS float animation (CSS transform, separate layer) */}
              <g
                className={node.floatClass}
                onClick={() => setSelectedId((p) => (p === node.id ? null : node.id))}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Soft glow on hover/selected */}
                {(isHovered || isSelected) && (
                  <circle r={node.r + 10} fill="none"
                    stroke={node.color} strokeOpacity={0.18} strokeWidth={8} />
                )}
                <circle
                  r={node.r}
                  fill={node.color}       fillOpacity={fillOpacity}
                  stroke={node.color}     strokeOpacity={strokeOpacity}
                  strokeWidth={1.5}
                  style={{ transition: "fill-opacity 0.2s, stroke-opacity 0.2s" }}
                />
                <g fill={node.color} fillOpacity={labelOpacity}
                   style={{ transition: "fill-opacity 0.2s" }}>
                  <NodeLabel label={node.label} r={node.r} />
                </g>
              </g>
            </g>
          );
        })}
      </svg>

      {/* [EXPERIMENTAL] Selected node detail panel */}
      {selectedNode && (
        <ConceptDetail node={selectedNode} entries={entries} onClose={() => setSelectedId(null)} />
      )}

      <p className="text-stone-600 text-xs mt-3">
        {concepts.length} patterns · tap a node to explore
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// [EXPERIMENTAL] Public export — gate wraps inner component
// ─────────────────────────────────────────────────────────────
export function ThoughtConstellation({ entries }: { entries: JournalEntry[] }) {
  if (!CONSTELLATION_ENABLED) return null;
  return <ConstellationInner entries={entries} />;
}
