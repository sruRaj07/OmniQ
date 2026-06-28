/**
 * OmniQ shared package - HTTP status constants.
 * Author: OmniQ Team
 */
export const httpStatusCodes = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  tooManyRequests: 429,
  serverError: 500
} as const;
