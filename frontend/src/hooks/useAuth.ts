/**
 * OmniQ mobile app - auth state hook.
 * Author: OmniQ Team
 */
import { useUserStore } from "@/store/userStore";

export function useAuth() {
  const profile = useUserStore((state) => state.profile);
  return {
    user: profile,
    isAuthenticated: true,
    isLoading: false
  };
}
