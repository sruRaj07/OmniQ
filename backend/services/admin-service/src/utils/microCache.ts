/**
 * OmniQ admin service - in-process read cache with single-flight and stale-while-revalidate.
 *
 * The admin dashboard is a screen operators leave open and pull down on. Every one of those pulls
 * previously fanned out into six Supabase round-trips, one of which scanned the entire orders
 * table. Two admins refreshing at the same moment ran all of it twice.
 *
 * This collapses that:
 *
 *  - single-flight: concurrent callers asking for the same key share one in-flight promise, so N
 *    simultaneous requests cost exactly one database round-trip rather than N.
 *  - fresh window (`ttlMs`): repeat reads inside the window are answered from memory in microseconds
 *    and never touch the network.
 *  - stale window (`staleMs`): past the TTL the cached value is still returned immediately while a
 *    refresh runs in the background. The operator never waits on a cold aggregate, and the next
 *    read has the new one.
 *
 * A failed refresh does not evict: the last good value keeps being served (and the failure is
 * logged) rather than turning a transient Supabase blip into an error on the operator's screen.
 * A cold miss propagates its error normally - there is nothing to serve instead.
 *
 * Deliberately in-process and unbounded-in-time but bounded-in-keys: the admin service holds a
 * handful of cache keys, so a Map costs a few KB and needs no Redis dependency.
 *
 * Author: OmniQ Team
 */

type CacheEntry<T> = {
  value: T;
  storedAt: number;
  /** Set while a refresh is running so a second caller does not start another one. */
  inFlight?: Promise<T>;
};

const store = new Map<string, CacheEntry<unknown>>();
/** Cold-start single-flight: callers racing on a key with no cached value yet. */
const pending = new Map<string, Promise<unknown>>();

export type CacheOptions = {
  /** How long the value is considered fresh. Served from memory, no refresh. */
  ttlMs: number;
  /** How long past the TTL a stale value may still be served while refreshing behind it. */
  staleMs?: number;
};

export async function cached<T>(
  key: string,
  producer: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const { ttlMs, staleMs = ttlMs * 4 } = options;
  const entry = store.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (entry) {
    const age = now - entry.storedAt;
    if (age < ttlMs) return entry.value;

    if (age < ttlMs + staleMs) {
      // Stale but usable. Kick off a refresh unless one is already running, and return immediately.
      if (!entry.inFlight) {
        entry.inFlight = producer()
          .then((value) => {
            store.set(key, { value, storedAt: Date.now() });
            return value;
          })
          .catch((error) => {
            // Keep serving the last good value; drop the in-flight marker so the next read retries.
            entry.inFlight = undefined;
            console.error(`[microCache] background refresh failed for "${key}":`, error?.message ?? error);
            return entry.value;
          });
      }
      return entry.value;
    }
    // Too old to serve. Fall through and block on a fresh read.
  }

  const existing = pending.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const flight = producer()
    .then((value) => {
      store.set(key, { value, storedAt: Date.now() });
      return value;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, flight);
  return flight;
}

/**
 * Drops cached entries so the next read is authoritative. Called after a write that changes what a
 * cached aggregate would report - approving a seller must show up on the dashboard immediately, not
 * whenever the TTL happens to lapse.
 *
 * `prefix` invalidates every key beginning with it; with no argument the whole cache is cleared.
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    pending.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of pending.keys()) {
    if (key.startsWith(prefix)) pending.delete(key);
  }
}
