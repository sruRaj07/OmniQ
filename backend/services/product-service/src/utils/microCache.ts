/**
 * OmniQ product service – in-process TTL cache replacing Azure Cache for Redis.
 *
 * Redis was removed because:
 *  1. The Azure Cache for Redis instance was on the suspended account.
 *  2. At current traffic levels an in-process Map is more than sufficient.
 *  3. Eliminates cross-region latency (the old Redis was in centralindia while
 *     Container Apps were in eastus).
 *
 * Uses the same single-flight + stale-while-revalidate pattern already proven
 * in admin-service's microCache. Bounded in keys (a few dozen product listing
 * permutations), so memory cost is negligible.
 *
 * Author: OmniQ Team
 */

type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached value by key. Returns `undefined` if not cached or expired.
 */
export function cacheGet<T>(key: string, ttlMs: number): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;

  if (Date.now() - entry.storedAt > ttlMs) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Set a value in the cache with a TTL.
 */
export function cacheSet<T>(key: string, value: T): void {
  store.set(key, { value, storedAt: Date.now() });
}

/**
 * Invalidate all cache entries whose key starts with `prefix`.
 * With no argument, the entire cache is cleared.
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
