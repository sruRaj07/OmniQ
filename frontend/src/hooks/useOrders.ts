/**
 * OmniQ mobile app - order data hook.
 * Author: OmniQ Team
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export function useOrders() {
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

  return {
    buyerOrders: buyerQuery.data || [],
    sellerOrders: sellerQuery.data || [],
    isLoading: buyerQuery.isLoading || sellerQuery.isLoading
  };
}
