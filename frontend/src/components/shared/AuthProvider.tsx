import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized, setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

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

  if (!initialized) {
    return null; // Or a splash screen / loading spinner
  }

  return <>{children}</>;
}
