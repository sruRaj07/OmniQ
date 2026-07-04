/**
 * OmniQ mobile app - serviceable location hook.
 * Author: OmniQ Team
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export function useLocation(pincode?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["zone-check", pincode],
    queryFn: async () => {
      if (!pincode) return { isServiceable: false, zoneName: null };
      const response = await apiClient.post("/location/zone-check", { pincode });
      return response.data.data; // our standard API response format { success: true, data: { ... } }
    },
    enabled: !!pincode
  });

  return {
    isServiceable: data?.isServiceable || false,
    zoneName: data?.zoneName || null,
    isLoading
  };
}
