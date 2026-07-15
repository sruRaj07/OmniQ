/**
 * OmniQ mobile app - Supabase browser/client initialization.
 * Crash-safe: validates config before creating client.
 * Author: OmniQ Team
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/constants/config";

function createSafeClient(): SupabaseClient {
  const url = config.supabaseUrl;
  const key = config.supabaseAnonKey;

  if (!url || !key || !url.startsWith("http")) {
    console.error("[OmniQ] Invalid Supabase config — URL:", url ? "set" : "MISSING", "Key:", key ? "set" : "MISSING");
    // Return a client pointing to the production URL as a last-resort fallback
    return createClient(
      "https://xrhqopzudhuwgbmmsbtz.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyaHFvcHp1ZGh1d2dibW1zYnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTgyMzYsImV4cCI6MjA5ODI3NDIzNn0.aoGqKaZoZQ_2e36u-49jF6RHqP-fzJ7Ww6DGgQ75HWc",
      {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    );
  }

  return createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSafeClient();
