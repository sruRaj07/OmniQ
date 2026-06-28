/**
 * OmniQ API gateway - tiered rate limiting.
 * Author: OmniQ Team
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
      response.status(429).json(fail("RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.", undefined, Math.ceil(Number(options.windowMs) / 1000)));
    }
  });
}

const userKey = (request: Request): string => request.user?.id ?? request.ip ?? "unknown";

export const globalLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 300 });
export const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
export const orderLimiter = rateLimiter({ windowMs: 60 * 1000, max: 5, keyGenerator: userKey });
export const productListLimiter = rateLimiter({ windowMs: 60 * 1000, max: 60 });
export const adminLimiter = rateLimiter({ windowMs: 5 * 60 * 1000, max: 50, keyGenerator: userKey });
export const zoneCheckLimiter = rateLimiter({ windowMs: 60 * 1000, max: 10, keyGenerator: userKey });
