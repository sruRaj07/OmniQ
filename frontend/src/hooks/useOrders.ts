/**
 * OmniQ mobile app - order data hook with Stale-While-Revalidate zero-spinner policies.
 * Author: OmniQ Team
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export function useOrders() {
  const queryClient = useQueryClient();

  const buyerQuery = useQuery({
    queryKey: ["buyer-orders"],
    queryFn: async () => {
      const { data } = await apiClient.get("/orders");
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // Serve instant memory cache for 5 minutes without re-fetching
    gcTime: 30 * 60 * 1000,   // Keep unused data in memory for 30 minutes
    placeholderData: (previousData: any) => previousData, // Prevent flickering loaders during tab switches
  });

  const sellerQuery = useQuery({
    queryKey: ["seller-orders"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/orders/seller");
        return data.data || [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 3 * 60 * 1000, // 3-minute instant cache for seller operations
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData: any) => previousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data } = await apiClient.patch(`/orders/${orderId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post(`/orders/${orderId}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    },
  });

  return {
    buyerOrders: buyerQuery.data || [],
    sellerOrders: sellerQuery.data || [],
    isLoading: buyerQuery.isLoading || sellerQuery.isLoading,
    isFetching: buyerQuery.isFetching || sellerQuery.isFetching,
    updateOrderStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    cancelOrder: cancelOrderMutation.mutateAsync,
    isCancelling: cancelOrderMutation.isPending,
  };
}
