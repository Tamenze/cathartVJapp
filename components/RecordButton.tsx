"use client";

import { AudioVisualizer } from "@/components/AudioVisualizer";
import type { RecordingState } from "@/types";

interface Props {
  state: RecordingState;
  elapsedSeconds: number;
  remainingSeconds: number;
  maxSeconds: number;
  isBlocked: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onSubmit: () => void;
  onRerecord: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RecordButton({
  state,
  elapsedSeconds,
  remainingSeconds,
  isBlocked,
  analyserRef,
  onStart,
  onStop,
  onPause,
  onResume,
  onSubmit,
  onRerecord,
}: Props) {
  const isRecording  = state === "recording";
  const isPaused     = state === "paused";
  const isProcessing = state === "processing";
  const isStopped    = state === "stopped";
  const isDisabled   = isBlocked || isProcessing;

  if (isStopped) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-center space-y-0.5">
          <p className="text-stone-300 text-sm font-medium">Recording ready</p>
          <p className="text-stone-500 text-xs">{formatTime(elapsedSeconds)} recorded</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSubmit}
            className="px-5 py-2 rounded-full bg-teal-500/15 border border-teal-500/40 text-teal-400 text-sm font-medium hover:bg-teal-500/25 transition-colors"
          >
            Submit
          </button>
          <button
            onClick={onRerecord}
            className="px-5 py-2 rounded-full bg-stone-800 border border-stone-700 text-stone-400 text-sm font-medium hover:text-stone-200 hover:border-stone-500 transition-colors"
          >
            Re-record
          </button>
        </div>
      </div>
    );
  }

  const label = isProcessing
    ? "Processing…"
    : isRecording
    ? "Stop"
    : isPaused
    ? "Paused"
    : isBlocked
    ? "Limit reached"
    : "Record";

  const labelColor = isRecording
    ? "text-red-300"
    : isPaused
    ? "text-amber-400"
    : isDisabled
    ? "text-stone-500"
    : "text-teal-400";

  const buttonClass = [
    "relative w-28 h-28 rounded-full flex items-center justify-center",
    "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
    isRecording
      ? "bg-red-500/20 border-2 border-red-400 shadow-[0_0_32px_rgba(239,68,68,0.18)] scale-110"
      : isPaused
      ? "bg-amber-500/10 border-2 border-amber-400/60"
      : isDisabled
      ? "bg-stone-800 border-2 border-stone-700 opacity-40 cursor-not-allowed"
      : "bg-teal-500/10 border-2 border-teal-500 hover:bg-teal-500/20 hover:scale-105 active:scale-95",
  ].join(" ");

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <button
          onClick={isRecording ? onStop : isPaused ? onStop : onStart}
          disabled={isDisabled}
          aria-label={label}
          className={buttonClass}
        >
          <span className={`text-sm font-medium tracking-wide ${labelColor}`}>
            {label}
          </span>
        </button>
      </div>

      {(isRecording || isPaused) && (
        <div className="flex flex-col items-center gap-3">
          {isRecording && (
            <AudioVisualizer analyserRef={analyserRef} active />
          )}
          <div className="text-center space-y-0.5">
            <p className="text-stone-200 text-2xl font-mono tabular-nums">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="text-stone-500 text-xs">
              {formatTime(remainingSeconds)} remaining
            </p>
          </div>

          {isRecording ? (
            <button
              onClick={onPause}
              className="text-stone-500 hover:text-stone-300 text-xs transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              Pause
            </button>
          ) : (
            <button
              onClick={onResume}
              className="text-amber-400 hover:text-amber-300 text-xs transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
              Resume
            </button>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-stone-400 text-sm">
          <span className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" />
          Transcribing &amp; reflecting…
        </div>
      )}
    </div>
  );
}
