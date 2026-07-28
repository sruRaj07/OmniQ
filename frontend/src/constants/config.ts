import { Platform } from 'react-native';

const localApi = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

// Secure HTTPS Production Backend
const PROD_API = "https://api-gateway.redbay-317d5a3d.eastus.azurecontainerapps.io";
const PROD_SUPABASE_URL = "https://xrhqopzudhuwgbmmsbtz.supabase.co";
const PROD_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyaHFvcHp1ZGh1d2dibW1zYnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTgyMzYsImV4cCI6MjA5ODI3NDIzNn0.aoGqKaZoZQ_2e36u-49jF6RHqP-fzJ7Ww6DGgQ75HWc";

const getDevApiUrl = () => {
  // On Web in development, automatically match the browser's current hostname (localhost or LAN IP)
  // to prevent network errors caused by stale LAN IPs in .env
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    return `http://${window.location.hostname || 'localhost'}:4000`;
  }
  return process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
};

const resolvedApiUrl = __DEV__ 
  ? getDevApiUrl()
  : PROD_API;

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY,
  apiBaseUrl: resolvedApiUrl,
  fallbackApiUrl: PROD_API,
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "",
  defaultZone: {
    city: "Bengaluru",
    radiusKm: 15
  }
} as const;
