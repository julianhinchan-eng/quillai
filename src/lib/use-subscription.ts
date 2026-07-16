import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription, type SubscriptionDetails } from "@/lib/paywall.functions";

export type SubscriptionStatus = {
  hasActiveSubscription: boolean;
  subscription: SubscriptionDetails;
};

function computeActive(sub: SubscriptionDetails): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (!sub.current_period_end) return true;
  return new Date(sub.current_period_end) > new Date();
}

let cached: SubscriptionStatus | null = null;
let inflight: Promise<SubscriptionStatus> | null = null;
const listeners = new Set<(s: SubscriptionStatus) => void>();

export function useSubscriptionStatus() {
  const fetchSub = useServerFn(getMySubscription);
  const [status, setStatus] = useState<SubscriptionStatus | null>(cached);

  const refresh = useCallback(async () => {
    if (!inflight) {
      inflight = fetchSub()
        .then((sub) => {
          const next: SubscriptionStatus = {
            subscription: sub,
            hasActiveSubscription: computeActive(sub),
          };
          cached = next;
          listeners.forEach((l) => l(next));
          return next;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  }, [fetchSub]);

  useEffect(() => {
    const l = (s: SubscriptionStatus) => setStatus(s);
    listeners.add(l);
    if (!cached) refresh().catch(() => {});
    return () => {
      listeners.delete(l);
    };
  }, [refresh]);

  return {
    status,
    hasActiveSubscription: !!status?.hasActiveSubscription,
    refresh,
  };
}

export function invalidateSubscriptionStatus() {
  cached = null;
  inflight = null;
}
