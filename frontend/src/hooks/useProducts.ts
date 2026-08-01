/**
 * OmniQ mobile app - product data hook powered by TanStack React Query.
 * Uses cursor-based infinite scrolling for lazy loading as the user scrolls.
 * Author: OmniQ Team
 */
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { Product } from "@/types/product.types";

const PAGE_SIZE = 10;

export function useProducts() {
  const query = useInfiniteQuery({
    queryKey: ["products", "all"],
    queryFn: async ({ pageParam }): Promise<{
      products: Product[];
      nextCursor: string | null;
    }> => {
      const params: Record<string, string> = { limit: String(PAGE_SIZE) };
      if (pageParam) {
        params.cursor = pageParam;
      }
      const response = await apiClient.get("/products", { params });
      const data = response.data;
      // The API returns { success, data: Product[], meta: { nextCursor } }
      const products = data?.data ?? data ?? [];
      const nextCursor = data?.meta?.nextCursor ?? null;
      return { products: Array.isArray(products) ? products : [], nextCursor };
    },
    initialPageParam: "" as string,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Flatten all pages into a single products array
  const products = query.data?.pages.flatMap((page) => page.products) ?? [];

  return {
    products,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

export function useSellerProducts() {
  const query = useQuery({
    queryKey: ["products", "seller"],
    queryFn: async (): Promise<Product[]> => {
      const response = await apiClient.get("/products/seller");
      return response.data?.data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData: any) => previousData,
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
