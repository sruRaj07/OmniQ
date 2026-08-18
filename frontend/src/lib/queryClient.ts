/**
 * OmniQ mobile app - React Query client with MMKV-backed persistence.
 * Tuned for 2G networks and low-end devices (Redmi 9A class).
 * Author: OmniQ Team
 */
import { QueryClient, defaultShouldDehydrateQuery, keepPreviousData } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import type { NetworkQuality } from "@/hooks/useNetworkQuality";

/** Cache lifetimes, exported so hooks can opt into the right tier. */
export const STALE_TIME = {
  /** Product catalogue changes slowly. */
  products: 5 * 60 * 1000,
  /** Order status must stay close to live. */
  orders: 30 * 1000,
  /** Profile is near-static within a session. */
  profile: 10 * 60 * 1000,
} as const;

/** Retained in RAM and on disk for a full day. */
export const GC_TIME = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Network quality, read imperatively
// ---------------------------------------------------------------------------
// queryClient is a module singleton created at import time, so it cannot call
// React hooks. useNetworkQuality pushes changes here instead; retry/staleTime
// read this mutable value at call time.

let currentNetworkQuality: NetworkQuality = "4g";

export function setNetworkQuality(quality: NetworkQuality): void {
  currentNetworkQuality = quality;
}

export function getNetworkQuality(): NetworkQuality {
  return currentNetworkQuality;
}

/** Retry budget scales with the connection. */
function retryForNetwork(failureCount: number): boolean {
  switch (currentNetworkQuality) {
    case "offline":
    case "2g":
      return failureCount < 1;
    case "3g":
      return failureCount < 2;
    default:
      return failureCount < 3;
  }
}

/** On 2G, hold cached data far longer rather than spending bandwidth. */
function staleTimeForNetwork(base: number): number {
  if (currentNetworkQuality === "offline" || currentNetworkQuality === "2g") {
    return Math.max(base, 10 * 60 * 1000);
  }
  return base;
}

// ---------------------------------------------------------------------------
// Error surfacing
// ---------------------------------------------------------------------------

type ErrorListener = (message: string) => void;
let errorListener: ErrorListener | null = null;

/** Registered by the toast host so query failures can be surfaced in the UI. */
export function setQueryErrorListener(listener: ErrorListener | null): void {
  errorListener = listener;
}

function reportError(error: unknown): void {
  // Offline is an expected state here, not a failure worth interrupting for —
  // OfflineBanner already communicates it.
  if (currentNetworkQuality === "offline") return;

  const message =
    (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message ??
    (error as Error)?.message ??
    "Something went wrong. Please try again.";

  errorListener?.(message);
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: staleTimeForNetwork(STALE_TIME.products),
      gcTime: GC_TIME,
      // Paginated hooks show the previous page while the next one loads,
      // which avoids a full-screen spinner on slow connections.
      placeholderData: keepPreviousData,
      retry: (failureCount) => retryForNetwork(failureCount),
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: "offlineFirst",
      refetchOnReconnect: "always",
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      networkMode: "offlineFirst",
      onError: reportError,
    },
  },
});

queryClient.getQueryCache().config.onError = reportError;

// ---------------------------------------------------------------------------
// MMKV persistence
// ---------------------------------------------------------------------------
// MMKV v4 is a Nitro (native) module: absent in Expo Go and during static web
// export. Failing to load it must not take the app down — we fall back to an
// in-memory store, which simply means the cache does not survive a restart.

function createCacheStorage() {
  try {
    // Required lazily so the native module is only touched when available.
    const { MMKV } = require("react-native-mmkv");
    const mmkv = new MMKV({ id: "omniq-query-cache" });
    return {
      getItem: (key: string) => mmkv.getString(key) ?? null,
      setItem: (key: string, value: string) => mmkv.set(key, value),
      removeItem: (key: string) => mmkv.delete(key),
    };
  } catch {
    console.warn("[OmniQ] MMKV unavailable — query cache will not persist across restarts.");
    const memory = new Map<string, string>();
    return {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    };
  }
}

const persister = createSyncStoragePersister({
  storage: createCacheStorage(),
  key: "omniq-query-cache-v1",
  // Compacted writes: the cache is rewritten at most once per second.
  throttleTime: 1000,
});

/**
 * Query keys that must never be written to disk. Anything that decides what a user is
 * allowed to reach belongs here: a 24h-old answer restored from MMKV would gate the app on
 * a fact that was true yesterday. "sellerStatus" is the seller-portal check — persisting it
 * meant a buyer who later became a seller kept being shown the application form.
 */
const NON_PERSISTED_QUERY_KEYS = new Set<string>(["sellerStatus"]);

persistQueryClient({
  queryClient,
  persister,
  maxAge: GC_TIME,
  // Bump this when the cached shape changes so stale entries are discarded.
  buster: "v2",
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      !NON_PERSISTED_QUERY_KEYS.has(String(query.queryKey?.[0])) &&
      defaultShouldDehydrateQuery(query),
  },
});
