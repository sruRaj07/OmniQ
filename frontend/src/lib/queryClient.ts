/**
 * OmniQ mobile app - React Query client.
 * Configured for production resilience with retries and offline support.
 * Author: OmniQ Team
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes: display cached data instantly during route navigation
      gcTime: 24 * 60 * 60 * 1000, // 24 hours: retain cache in RAM across app sessions
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'offlineFirst',
      refetchOnReconnect: 'always',
      refetchOnWindowFocus: false, // Prevent background refetches when toggling browser tabs
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
