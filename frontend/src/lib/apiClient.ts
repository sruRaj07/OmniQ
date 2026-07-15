/**
 * OmniQ mobile app - backend API client with retry & error handling.
 * Author: OmniQ Team
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { config } from "@/constants/config";
import { supabase } from "./supabase";

// --- Token Cache ---
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      cachedToken = session.access_token;
      // Cache for 4 minutes (tokens are typically valid for 1 hour)
      tokenExpiry = now + 4 * 60 * 1000;
      return cachedToken;
    }
  } catch (err) {
    console.warn("[OmniQ] Failed to get auth token:", err);
  }
  return null;
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

// --- Response Interceptor: Handle 401 + network errors ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // On 401, clear the cached token so the next request fetches a fresh one
    if (error.response?.status === 401) {
      cachedToken = null;
      tokenExpiry = 0;
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
  const delay = RETRY_DELAY_MS * Math.pow(2, axiosConfig._retryCount - 1);

  await new Promise((resolve) => setTimeout(resolve, delay));
  return apiClient.request(axiosConfig);
});
