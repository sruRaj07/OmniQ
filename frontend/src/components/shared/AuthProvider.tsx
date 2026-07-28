import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized, setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    // Check active session on mount — wrapped in try/catch to prevent crash
    // when network is unavailable on first launch
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.warn("[OmniQ] Failed to restore session:", err);
        setSession(null);
      } finally {
        setInitialized(true);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inAdminGroup = segments[0] === "admin-login"; // allow admin login

    if (session && (inAuthGroup || inAdminGroup)) {
      // Redirect logged-in users away from auth screens
      router.replace("/(buyer)");
    } else if (!session && !inAuthGroup && !inAdminGroup) {
      // Redirect logged-out users to sign-in
      router.replace("/(auth)");
    }
  }, [session, initialized, segments]);

  return <>{children}</>;
}
