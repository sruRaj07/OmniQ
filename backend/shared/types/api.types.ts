/**
 * OmniQ shared package - API response contracts.
 * Author: OmniQ Team
 */
export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
};

export type ApiSuccess<TData> = {
  success: true;
  data: TData;
  meta?: ApiMeta;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    retryAfter?: number;
  };
};

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;
