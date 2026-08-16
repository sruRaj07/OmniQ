/**
 * OmniQ mobile app - pull every visible screen back in sync with the database.
 *
 * The query client persists to MMKV for 24h and does not refetch on window focus, so a session
 * that stays open can sit on stale data indefinitely. This is the one deliberate way out of that
 * without restarting the app.
 *
 * Author: OmniQ Team
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";

/**
 * A refresh that resolves instantly still holds the spinner this long. Without it a warm cache
 * makes the control flicker, which reads as "nothing happened" rather than "already up to date".
 */
const MIN_SPINNER_MS = 450;

export type DataRefresh = {
  /** Refetch everything on screen. Safe to call repeatedly; overlapping calls are ignored. */
  refresh: () => Promise<void>;
  isRefreshing: boolean;
};

export function useDataRefresh(): DataRefresh {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inFlight = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    // A second tap (or a pull mid-refresh) would double every request for no benefit.
    if (inFlight.current) return;
    inFlight.current = true;
    setIsRefreshing(true);
    const startedAt = Date.now();

    try {
      const work: Promise<unknown>[] = [
        // ⚡ PERFORMANCE: refetchType "active" spends network only on queries that are currently
        // mounted. Everything else is merely marked stale, so it refetches when the user next
        // opens that screen instead of paying now for data nobody is looking at. On a 2G phone
        // the difference is one request versus a dozen.
        queryClient.invalidateQueries({ refetchType: "active" }),
      ];

      // The cart lives in Zustand, outside the query cache, so invalidateQueries cannot see it.
      // Only buyers have one - refetching it for a seller or admin is a wasted round trip.
      const isSignedIn = Boolean(useAuthStore.getState().session);
      const isBuyer = useUserStore.getState().profile.role === "buyer";
      if (isSignedIn && isBuyer) {
        work.push(useCartStore.getState().fetchCart());
      }

      // allSettled: one failing endpoint must not abandon the rest of the refresh.
      await Promise.allSettled(work);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPINNER_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_SPINNER_MS - elapsed));
      }
      inFlight.current = false;
      if (isMounted.current) setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, isRefreshing };
}
