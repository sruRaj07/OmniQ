/**
 * OmniQ shared package - standard API response helpers.
 * Author: OmniQ Team
 */
import type { ApiFailure, ApiMeta, ApiSuccess } from "../types/api.types";

export function ok<TData>(data: TData, meta?: ApiMeta): ApiSuccess<TData> {
  return { success: true, data, meta };
}

export function fail(code: string, message: string, requestId?: string, retryAfter?: number): ApiFailure {
  return { success: false, error: { code, message, requestId, retryAfter } };
}
