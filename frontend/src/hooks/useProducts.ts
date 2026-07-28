/**
 * OmniQ mobile app - product data hook powered by TanStack React Query.
 * Provides instant display of cached inventory and silent background synchronization.
 * Author: OmniQ Team
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { Product } from "@/types/product.types";

export function useProducts() {
  const query = useQuery({
    queryKey: ["products", "all"],
    queryFn: async (): Promise<Product[]> => {
      const response = await apiClient.get("/products");
      return response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // Considered fresh for 5 mins
    gcTime: 30 * 60 * 1000,   // Retained in RAM for 30 minutes for instant navigation
    placeholderData: (previousData: any) => previousData, // Maintain existing cards while silent revalidations run
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
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
    staleTime: 2 * 60 * 1000, // Shorter 2-minute stale time for active seller dashboard
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
