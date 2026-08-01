import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";

export function useSellerStatus() {
  const user = useAuthStore(state => state.user);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sellerStatus", user?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/sellers/me");
        return res.data.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null; // Not a seller yet
        }
        throw error;
      }
    },
    enabled: !!user,
  });

  return { sellerProfile: data, isLoading, refetch };
}
