"use client";

import type { QuotaStatus } from "@/types";

interface Props {
  quota: QuotaStatus;
  loading: boolean;
}

export function QuotaBar({ quota, loading }: Props) {
  if (loading) {
    return (
      <div className="h-14 flex items-center justify-center">
        <div className="w-48 h-2 bg-stone-800 rounded-full animate-pulse" />
      </div>
    );
  }

  const pct = Math.round((quota.userRemaining / 20) * 100);

  if (quota.isBlocked) {
    return (
      <div className="text-center space-y-1">
        <p className="text-amber-400 text-sm font-medium">
          Today&apos;s reflection limit has been reached.
        </p>
        <p className="text-stone-500 text-xs">
          Your entries are saved locally. Come back tomorrow.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span>Daily reflection time</span>
        <span>
          <span className="text-stone-200 font-medium">
            {quota.userRemaining.toFixed(1)}
          </span>{" "}
          / 20 min remaining
        </span>
      </div>
      <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
