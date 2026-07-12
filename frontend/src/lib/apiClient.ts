/**
 * OmniQ mobile app - backend API client.
 * Author: OmniQ Team
 */
import axios from "axios";
import { config } from "@/constants/config";
import { supabase } from "./supabase";

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30_000
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
  (error) => {
    // Fail immediately if there's an error (local backend only)
    return Promise.reject(error);
  }
);
