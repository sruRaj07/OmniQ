import { Platform } from 'react-native';

const localApi = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
// Secure HTTPS Production Backend
const azureApi = "https://api-gateway.redbay-317d5a3d.eastus.azurecontainerapps.io";

// Robust Environment Handling:
// In Development (__DEV__ = true): Use the local IP from .env, or fallback to simulator defaults.
// In Production/APK (__DEV__ = false): Strictly use the secure Azure API to prevent local IP connection errors.
const resolvedApiUrl = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_URL || localApi) 
  : azureApi;

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiBaseUrl: resolvedApiUrl,
  fallbackApiUrl: azureApi,
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "",
  defaultZone: {
    city: "Bengaluru",
    radiusKm: 15
  }
} as const;

