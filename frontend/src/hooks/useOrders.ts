/**
 * OmniQ mobile app - order data hook.
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
    }
  });

  const sellerQuery = useQuery({
    queryKey: ["seller-orders"],
    queryFn: async () => {
      // If the user is not a seller, this might fail, so we catch and return []
      try {
        const { data } = await apiClient.get("/orders/seller");
        return data.data || [];
      } catch (error) {
        return [];
      }
    }
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

  return {
    buyerOrders: buyerQuery.data || [],
    sellerOrders: sellerQuery.data || [],
    isLoading: buyerQuery.isLoading || sellerQuery.isLoading,
    updateOrderStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}
