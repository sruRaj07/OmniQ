/**
 * OmniQ shared package - standard API response helpers.
 * Author: OmniQ Team
 */
import type { ApiFailure, ApiMeta, ApiSuccess } from "../types/api.types";

export function ok<TData>(data: TData, meta?: ApiMeta): ApiSuccess<TData> {
  return { success: true, data, meta };
}

/**
 * Controllers build failure messages by interpolating whatever the database driver said, e.g.
 * `Failed to fetch seller: ${error.message}`. That put raw Postgres text in front of the client:
 *
 *   GET /sellers/not-a-uuid
 *   -> "Failed to fetch seller: invalid input syntax for type uuid: \"not-a-uuid\""
 *
 * and, when a URL upset the CDN in front of Supabase, pasted an entire Cloudflare HTML error page
 * into a JSON error string. Neither means anything to a shopper, both describe our schema and
 * infrastructure to anyone who asks, and the HTML case produced a multi-kilobyte payload.
 *
 * Sanitising here rather than in each controller covers every service in one place and cannot be
 * forgotten at a new call site. The original text is untouched in the logs - controllers already
 * `console.error` the real error - so nothing is lost for debugging.
 *
 * Only driver and CDN noise is rewritten. Messages we author ourselves, including the Supabase Auth
 * strings the sign-in screen matches on ("invalid login credentials", "email not confirmed"), do
 * not match these patterns and pass through unchanged.
 */
const MAX_MESSAGE_LENGTH = 300;

const DATABASE_NOISE = [
  /invalid input syntax for type/i,
  /duplicate key value violates/i,
  /violates (foreign key|check|not-null|unique) constraint/i,
  /(column|relation|function|schema) .* does not exist/i,
  /null value in column/i,
  /permission denied for/i,
  /could not connect to server/i,
  /^pg\w*:/i
];

// Not anchored to the start: controllers prepend their own context, so the page arrives as
// `Failed to fetch seller: <!DOCTYPE html>...` rather than as a bare document.
function looksLikeHtml(message: string): boolean {
  return /<(!doctype\b|html[\s>]|\?xml|head[\s>]|body[\s>])/i.test(message);
}

/** "Failed to fetch seller: <detail>" -> "Failed to fetch seller", which is safe and still useful. */
function callerPrefix(message: string): string {
  const [prefix] = message.split(":");
  const trimmed = prefix?.trim() ?? "";
  const unsafe = trimmed.length === 0 || looksLikeHtml(trimmed) || DATABASE_NOISE.some((p) => p.test(trimmed));
  return unsafe ? "The request could not be completed" : trimmed;
}

export function sanitiseErrorMessage(message: string): string {
  if (typeof message !== "string" || message.length === 0) {
    return "Something went wrong. Please try again.";
  }

  // HTML here means an upstream (CDN, load balancer) answered instead of the API. The page tells the
  // caller nothing useful and runs to kilobytes, so only the caller's own prefix survives.
  if (looksLikeHtml(message)) {
    return `${callerPrefix(message)}. Please try again.`;
  }

  if (DATABASE_NOISE.some((pattern) => pattern.test(message))) {
    return `${callerPrefix(message)}. Please check the details and try again.`;
  }

  return message.length > MAX_MESSAGE_LENGTH ? `${message.slice(0, MAX_MESSAGE_LENGTH)}...` : message;
}

export function fail(code: string, message: string, requestId?: string, retryAfter?: number): ApiFailure {
  return { success: false, error: { code, message: sanitiseErrorMessage(message), requestId, retryAfter } };
}
