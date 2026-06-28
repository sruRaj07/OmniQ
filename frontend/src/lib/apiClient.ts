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
