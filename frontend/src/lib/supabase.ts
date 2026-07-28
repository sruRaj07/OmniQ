/**
 * OmniQ mobile app - Supabase browser/client initialization.
 * SSR-safe: guards against Node.js environments (no `window`) during static rendering.
 * Author: OmniQ Team
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/constants/config";
import { Platform } from "react-native";

// ⚡ SSR GUARD: AsyncStorage uses `window` internally, which crashes in Node.js during static export.
// Only import it in browser/native environments.
const getStorage = () => {
  if (typeof window === "undefined") {
    // During SSR/static rendering — return a no-op storage adapter
    return {
      getItem: (_key: string) => Promise.resolve(null),
      setItem: (_key: string, _value: string) => Promise.resolve(),
      removeItem: (_key: string) => Promise.resolve(),
    };
  }
  // In browser/native — use real AsyncStorage
  return require("@react-native-async-storage/async-storage").default;
};

function createSafeClient(): SupabaseClient {
  const url = config.supabaseUrl;
  const key = config.supabaseAnonKey;

  const authConfig = {
    auth: {
      storage: getStorage(),
      autoRefreshToken: typeof window !== "undefined",
      persistSession: typeof window !== "undefined",
      detectSessionInUrl: false,
    },
  };

  if (!url || !key || !url.startsWith("http")) {
    console.error("[OmniQ] Invalid Supabase config — URL:", url ? "set" : "MISSING", "Key:", key ? "set" : "MISSING");
    return createClient(
      "https://xrhqopzudhuwgbmmsbtz.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyaHFvcHp1ZGh1d2dibW1zYnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTgyMzYsImV4cCI6MjA5ODI3NDIzNn0.aoGqKaZoZQ_2e36u-49jF6RHqP-fzJ7Ww6DGgQ75HWc",
      authConfig
    );
  }

  return createClient(url, key, authConfig);
}

export const supabase = createSafeClient();
