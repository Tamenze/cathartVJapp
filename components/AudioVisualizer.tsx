"use client";

import { useEffect, useRef } from "react";

interface Props {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
}

const BAR_COUNT = 12;

export function AudioVisualizer({ analyserRef, active }: Props) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!active) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId: number;

    function tick() {
      analyser!.getByteFrequencyData(data);

      // Sample frequency bands spread across the low-mid range (voice frequencies)
      const bandSize = Math.floor(data.length * 0.4 / BAR_COUNT);
      const offset = Math.floor(data.length * 0.02); // skip sub-bass

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        let sum = 0;
        for (let j = 0; j < bandSize; j++) {
          sum += data[offset + i * bandSize + j];
        }
        const level = sum / (bandSize * 255); // 0–1
        const height = Math.max(0.08, level);
        bar.style.transform = `scaleY(${height})`;
        bar.style.opacity = String(0.35 + level * 0.65);
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    const bars = barsRef.current;
    return () => {
      cancelAnimationFrame(rafId);
      bars.forEach((bar) => {
        if (bar) {
          bar.style.transform = "scaleY(0.08)";
          bar.style.opacity = "0.35";
        }
      });
    };
  }, [active, analyserRef]);

  return (
    <div
      className="flex items-center gap-[3px] h-8"
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="block w-[3px] rounded-full bg-red-400 origin-bottom"
          style={{
            height: "100%",
            transform: "scaleY(0.08)",
            opacity: 0.35,
            transition: "transform 0.05s ease-out, opacity 0.05s ease-out",
          }}
        />
      ))}
    </div>
  );
}
