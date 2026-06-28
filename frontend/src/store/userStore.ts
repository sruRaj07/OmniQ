/**
 * OmniQ mobile app - user role state store.
 * Author: OmniQ Team
 */
import { create } from "zustand";
import type { UserProfile, UserRole } from "@/types/user.types";

type UserStore = {
  profile: UserProfile;
  setRole: (role: UserRole) => void;
};

export const useUserStore = create<UserStore>((set) => ({
  profile: {
    id: "demo-user",
    fullName: "Raj",
    role: "buyer"
  },
  setRole: (role: UserRole) =>
    set((state) => ({
      profile: { ...state.profile, role }
    }))
}));
