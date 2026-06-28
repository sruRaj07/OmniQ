/**
 * OmniQ mobile app - role helper hook.
 * Author: OmniQ Team
 */
import { useUserStore } from "@/store/userStore";
import type { UserRole } from "@/types/user.types";

export function useRole(): { role: UserRole; setRole: (role: UserRole) => void } {
  const role = useUserStore((state) => state.profile.role);
  const setRole = useUserStore((state) => state.setRole);
  return { role, setRole };
}
