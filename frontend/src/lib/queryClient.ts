/**
 * OmniQ mobile app - React Query client.
 * Configured for production resilience with retries and offline support.
 * Author: OmniQ Team
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'offlineFirst',
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
