"use client";

import { useState, useCallback } from "react";
import { getUserId } from "@/lib/userId";
import type { QuotaStatus } from "@/types";

const DEFAULT_QUOTA: QuotaStatus = {
  userUsed: 0,
  userRemaining: 20,
  globalUsed: 0,
  globalRemaining: 200,
  allowedMinutes: 20,
  isBlocked: false,
};


export function useQuota() {
  const [quota, setQuota] = useState<QuotaStatus>(DEFAULT_QUOTA);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/quota?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data: QuotaStatus = await res.json();
        setQuota(data);
      }
    } catch {
      // Keep last known state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  return { quota, loading, refresh };
}
