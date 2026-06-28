import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

type AuthStore = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  initialized: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setInitialized: (initialized) =>
    set({
      initialized,
    }),
}));
