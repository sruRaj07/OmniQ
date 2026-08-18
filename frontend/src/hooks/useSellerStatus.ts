/**
 * OmniQ mobile app - seller account status for the signed-in user.
 *
 * This answer decides whether someone reaches their store or is shown the application form,
 * so it has to be treated as an authorisation check, not as ordinary cached content.
 *
 * The previous version returned `null` both for "the server says this user has no seller
 * account" and for "the request failed / we have not asked yet". Callers could not tell the
 * two apart, so any 401, timeout or stale cache entry read as "not a seller" and pushed an
 * approved seller into the apply form. Worse, that `null` was written to the MMKV-backed
 * query cache (see lib/queryClient.ts) with a 24h maxAge, so a user who opened the app once
 * before applying kept getting the application form on every later launch.
 *
 * Author: OmniQ Team
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";

/** Root of the query key. Exported so the cache persister can exclude it from disk. */
export const SELLER_STATUS_QUERY_KEY = "sellerStatus";

/**
 * Returned only when the server explicitly answered 404. Distinct from `undefined`, which
 * means the question is still unanswered — a sentinel, so "no account" can never be
 * confused with "no answer".
 */
export const SELLER_ABSENT = "seller-absent" as const;

export type SellerStatusData = typeof SELLER_ABSENT | Record<string, any>;

/** Narrows a raw query result to a seller record, or null when the user has no account. */
export function sellerProfileOf(data: SellerStatusData | undefined): Record<string, any> | null {
  return data && data !== SELLER_ABSENT ? (data as Record<string, any>) : null;
}

export function useSellerStatus() {
  const user = useAuthStore(state => state.user);

  const query = useQuery<SellerStatusData>({
    queryKey: [SELLER_STATUS_QUERY_KEY, user?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/sellers/me");
        // A 200 with an empty body would otherwise cache as "no account"; treat it as absent
        // only when the server actually said so.
        return res.data?.data ?? SELLER_ABSENT;
      } catch (error: any) {
        if (error?.response?.status === 404) return SELLER_ABSENT;
        throw error;
      }
    },
    enabled: !!user,
    // Never serve a cached answer for an access gate. The global default is 5 minutes.
    staleTime: 0,
    // Keeps this out of the 24h persisted cache even if the persister predicate is bypassed.
    gcTime: 60 * 1000,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // apiClient drops its 4-minute token cache on a 401 but does not replay the request,
      // so the very next attempt carries a fresh token. One retry converts that stray 401
      // into a correct answer instead of a spurious "you have no seller account".
      if (status === 401) return failureCount < 1;
      // Any other 4xx is a real answer from the server; retrying will not change it.
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });

  const { data } = query;

  return {
    sellerProfile: sellerProfileOf(data),
    /** True only when the server confirmed this user has no seller account. */
    hasNoSellerAccount: data === SELLER_ABSENT,
    /** True while the answer is genuinely unknown — never treat this as "not a seller". */
    isUnresolved: data === undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
