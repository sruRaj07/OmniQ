/**
 * OmniQ API gateway - tiered rate limiting.
 * Author: OmniQ Team
 *
 * Limits are tuned for the Indian mobile market, where carrier-grade NAT puts very large numbers
 * of subscribers behind a single public IP. Per-IP limits are therefore set as denial-of-service
 * guards rather than per-user quotas; anything that needs a true per-account limit is keyed on the
 * verified user id, or enforced in user-service where the request body is available.
 */
import rateLimit, { type Options } from "express-rate-limit";
import type { Request } from "express";
import { fail } from "../../../../shared/utils/responseFormatter";

type RateLimiterConfig = Pick<Options, "windowMs" | "max"> & {
  skip?: Options["skip"];
  keyGenerator?: (request: Request) => string;
};

export function rateLimiter(config: RateLimiterConfig) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    windowMs: config.windowMs,
    max: config.max,
    skip: config.skip,
    keyGenerator: config.keyGenerator,
    handler: (_request, response, _next, options) => {
      response
        .status(429)
        .json(
          fail(
            "RATE_LIMIT_EXCEEDED",
            "Too many requests. Please try again later.",
            undefined,
            Math.ceil(Number(options.windowMs) / 1000)
          )
        );
    }
  });
}

// Keyed on the verified user id where we have one, falling back to IP for anonymous callers.
const userKey = (request: Request): string => request.user?.id ?? request.ip ?? "unknown";

export const globalLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 3000 });

// Unauthenticated credential endpoints. This is the shared-IP blast-radius guard; per-account
// throttling for a specific email lives in user-service, which can read the request body.
export const authLimiter = rateLimiter({ windowMs: 5 * 60 * 1000, max: 40 });

export const orderLimiter = rateLimiter({ windowMs: 60 * 1000, max: 10, keyGenerator: userKey });
export const productListLimiter = rateLimiter({ windowMs: 60 * 1000, max: 300 });
export const adminLimiter = rateLimiter({ windowMs: 5 * 60 * 1000, max: 200, keyGenerator: userKey });
export const zoneCheckLimiter = rateLimiter({ windowMs: 60 * 1000, max: 30, keyGenerator: userKey });
