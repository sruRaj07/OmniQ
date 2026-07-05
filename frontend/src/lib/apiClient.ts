/**
 * OmniQ mobile app - backend API client.
 * Author: OmniQ Team
 */
import axios from "axios";
import { config } from "@/constants/config";
import { supabase } from "./supabase";

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 12_000
});

apiClient.interceptors.request.use(async (req) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    req.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return req;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if it's a network error (no response), we haven't retried yet, and a fallback is configured
    if (!error.response && originalRequest && !originalRequest._retry && config.fallbackApiUrl) {
      originalRequest._retry = true;
      console.log(`[API Client] Network error on ${originalRequest.baseURL}. Falling back to Azure backend...`);
      
      // Update URL to absolute Azure URL to avoid baseURL conflicts
      const endpoint = originalRequest.url?.startsWith('/') ? originalRequest.url : `/${originalRequest.url}`;
      originalRequest.baseURL = undefined;
      originalRequest.url = `${config.fallbackApiUrl}${endpoint}`;
      
      // Retry using apiClient to ensure request interceptors (auth tokens) run again
      return apiClient(originalRequest);
    }
    
    return Promise.reject(error);
  }
);
