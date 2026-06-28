/**
 * OmniQ mobile app - runtime configuration.
 * Author: OmniQ Team
 */
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "",
  defaultZone: {
    city: "Bengaluru",
    radiusKm: 15
  }
} as const;
