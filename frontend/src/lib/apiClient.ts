/**
 * OmniQ mobile app - backend API client with retry & error handling.
 * Author: OmniQ Team
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { config } from "@/constants/config";
import { supabase } from "./supabase";

// --- Token Cache ---
// ⚡ PERFORMANCE: supabase.auth.getSession() hits AsyncStorage (and can trigger a refresh), which
// is far too expensive to repeat on every request. The token is held in memory between calls.
//
// The cache is bound to the identity that issued it. It previously expired on a blind 4-minute
// timer with no link to the session, so switching accounts - buyer -> admin at /admin-login is
// the common case - left the *previous* user's token in place for up to four minutes. Every
// admin request in that window carried a buyer token and the gateway answered 403, which the
// console rendered as an empty dashboard.
let cachedToken: string | null = null;
let tokenExpiry = 0;
let cachedForUserId: string | null = null;

/** Safety margin so a token is never presented in the last few seconds of its life. */
const TOKEN_SKEW_MS = 30 * 1000;
/** Upper bound on how long a token is reused, regardless of its own expiry. */
const TOKEN_MAX_CACHE_MS = 4 * 60 * 1000;

/**
 * Drops the cached token. Called on any auth state change and on a 401/403, so the next request
 * re-reads the session rather than replaying an identity that is no longer current.
 */
export function resetAuthTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
  cachedForUserId = null;
}

// Any change of session invalidates the cache immediately: sign-in, sign-out, token refresh and
// user update all fire here. Without this the cache is the only thing in the app that still
// believes in the old session.
//
// Guarded because this module is imported during the static web export, where the Supabase
// client runs with the no-op storage adapter from lib/supabase.ts.
try {
  supabase.auth.onAuthStateChange(() => {
    resetAuthTokenCache();
  });
} catch (err) {
  console.warn("[OmniQ] Could not subscribe to auth changes for token cache:", err);
}

/** Base64url decode that works on Hermes (atob), Node (Buffer) and neither. */
function decodeBase64Url(value: string): string | null {
  const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), "=");
  try {
    if (typeof globalThis.atob === "function") return globalThis.atob(padded);
    const maybeBuffer = (globalThis as any).Buffer;
    if (maybeBuffer?.from) return maybeBuffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
  return null;
}

/**
 * Reads `exp` from a JWT without verifying it - used only to decide when to stop reusing it.
 * Returning null is safe: the caller then falls back to the fixed cache ceiling.
 */
function expiryOf(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = decodeBase64Url(payload);
    if (!json) return null;
    const decoded = JSON.parse(json);
    return typeof decoded?.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      cachedToken = session.access_token;
      cachedForUserId = session.user?.id ?? null;
      // Honour the token's own expiry. A token that outlives the cache is harmless; a cache that
      // outlives the token is a guaranteed 401 on the next call.
      const jwtExpiry = expiryOf(session.access_token);
      const ceiling = now + TOKEN_MAX_CACHE_MS;
      tokenExpiry = jwtExpiry ? Math.min(ceiling, jwtExpiry - TOKEN_SKEW_MS) : ceiling;
      if (tokenExpiry <= now) {
        // Already expired or inside the skew window - use it once, cache nothing.
        tokenExpiry = 0;
      }
      return cachedToken;
    }
    // No session: make sure a stale token from a previous one cannot survive.
    resetAuthTokenCache();
  } catch (err) {
    console.warn("[OmniQ] Failed to get auth token:", err);
  }
  return null;
}

/** The user id the cached token belongs to, or null. Exposed for diagnostics and tests. */
export function cachedTokenUserId(): string | null {
  return cachedForUserId;
}

// --- Axios Instance ---
export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor: Attach token ---
apiClient.interceptors.request.use(async (req) => {
  const token = await getAuthToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// --- Response Interceptor: Handle 401/403 + network errors ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    // 403 matters as much as 401 here: the gateway returns it when the token's role does not
    // match the route, which is exactly what a stale cross-account token produces. Clearing on
    // 401 alone left the bad token in place for the rest of its cache window.
    if (status === 401 || status === 403) {
      resetAuthTokenCache();
    }
    return Promise.reject(error);
  }
);

// --- Retry Logic ---
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function shouldRetry(error: AxiosError): boolean {
  // Retry on network errors (no response) or 5xx server errors
  if (!error.response) return true; // Network error, timeout, etc.
  const status = error.response.status;
  // A 401/403 is retried exactly once, and only because the interceptor above has just dropped
  // the cached token - the replay therefore carries a freshly read one. Without this a single
  // stale-token request failed outright, and the caller had no way to tell "not allowed" from
  // "was holding the wrong token".
  if (status === 401 || status === 403) {
    const attempts = (error.config as { _retryCount?: number } | undefined)?._retryCount ?? 0;
    return attempts < 1;
  }
  return status >= 500 && status < 600;
}

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const axiosConfig = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
  if (!axiosConfig) return Promise.reject(error);

  axiosConfig._retryCount = axiosConfig._retryCount || 0;

  if (axiosConfig._retryCount >= MAX_RETRIES || !shouldRetry(error)) {
    return Promise.reject(error);
  }

  axiosConfig._retryCount += 1;
  const status = error.response?.status;
  // An auth replay is pointless to delay - the token has already been refreshed synchronously.
  const delay = status === 401 || status === 403
    ? 0
    : RETRY_DELAY_MS * Math.pow(2, axiosConfig._retryCount - 1);

  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  return apiClient.request(axiosConfig);
});
