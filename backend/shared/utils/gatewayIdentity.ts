/**
 * OmniQ shared package - trusted identity propagation from the API gateway.
 * Author: OmniQ Team
 *
 * Downstream services previously base64-decoded the JWT payload themselves and fell back to a
 * hardcoded DEFAULT_BUYER_ID when no token was present. That made every service independently
 * spoofable. The gateway is now the single verification point: it signature-checks the token,
 * strips any client-supplied x-omniq-* headers, and re-injects trusted identity headers.
 *
 * Services accept identity only from those headers, and only when accompanied by the shared
 * INTERNAL_GATEWAY_KEY, so a request that reaches a service by any other path carries no identity.
 */
import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { fail } from "./responseFormatter";

export type OmniqRole = "buyer" | "seller" | "admin";

export type GatewayUser = {
  id: string;
  role: OmniqRole;
  email?: string;
};

export const IDENTITY_HEADERS = {
  userId: "x-omniq-user-id",
  role: "x-omniq-user-role",
  email: "x-omniq-user-email",
  gatewayKey: "x-omniq-gateway-key"
} as const;

declare module "express-serve-static-core" {
  interface Request {
    omniqUser?: GatewayUser;
  }
}

const gatewayKey = process.env.INTERNAL_GATEWAY_KEY || "";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !gatewayKey) {
  console.error(
    "[gatewayIdentity] INTERNAL_GATEWAY_KEY is not set while NODE_ENV=production. " +
      "Authenticated routes will reject all requests until it is configured."
  );
}

/** Constant-time comparison so the shared key cannot be recovered by timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function gatewayKeyIsValid(request: Request): boolean {
  if (!gatewayKey) {
    // No key configured. Outside production this keeps local `pnpm dev` working; in production
    // the check above has already logged, and we refuse rather than trust the caller.
    return !isProduction;
  }
  const presented = request.header(IDENTITY_HEADERS.gatewayKey);
  return typeof presented === "string" && safeEqual(presented, gatewayKey);
}

function readIdentity(request: Request): GatewayUser | null {
  if (!gatewayKeyIsValid(request)) return null;

  const id = request.header(IDENTITY_HEADERS.userId);
  if (!id) return null;

  const rawRole = request.header(IDENTITY_HEADERS.role);
  const role: OmniqRole = rawRole === "admin" ? "admin" : rawRole === "seller" ? "seller" : "buyer";

  return { id, role, email: request.header(IDENTITY_HEADERS.email) || undefined };
}

/**
 * Populates request.omniqUser when the gateway supplied a verified identity, but does not
 * reject anonymous callers. Use on routes that are public but personalise when signed in.
 */
export function attachIdentity(request: Request, _response: Response, next: NextFunction): void {
  const user = readIdentity(request);
  if (user) request.omniqUser = user;
  next();
}

/** Rejects the request unless the gateway supplied a verified identity. */
export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const user = readIdentity(request);
  if (!user) {
    response.status(401).json(fail("UNAUTHORIZED", "Authentication is required for this resource."));
    return;
  }
  request.omniqUser = user;
  next();
}

/** Rejects the request unless the verified identity holds one of the given roles. */
export function requireRole(...roles: ReadonlyArray<OmniqRole>) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const user = readIdentity(request);
    if (!user) {
      response.status(401).json(fail("UNAUTHORIZED", "Authentication is required for this resource."));
      return;
    }
    if (!roles.includes(user.role)) {
      response.status(403).json(fail("FORBIDDEN", "You do not have access to this resource."));
      return;
    }
    request.omniqUser = user;
    next();
  };
}

/**
 * Returns the verified caller id, or throws. Controllers should use this instead of decoding
 * the Authorization header - there is deliberately no anonymous fallback identity.
 */
export function requireUserId(request: Request): string {
  const id = request.omniqUser?.id;
  if (!id) throw new Error("No authenticated user on request.");
  return id;
}
