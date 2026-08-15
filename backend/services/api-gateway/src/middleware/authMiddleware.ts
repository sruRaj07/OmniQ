/**
 * OmniQ API gateway - Supabase JWT auth middleware.
 * Author: OmniQ Team
 *
 * The gateway is the single point at which a client token is verified. Downstream services are
 * on internal ingress and trust only the identity headers injected here, so this middleware must
 * (a) verify the signature and (b) prevent a client from supplying its own identity headers.
 */
import type { NextFunction, Request, Response } from "express";
import { fail } from "../../../../shared/utils/responseFormatter";
import { bearerFrom, verifyAccessToken } from "../../../../shared/utils/jwtVerifier";
import { IDENTITY_HEADERS, type OmniqRole } from "../../../../shared/utils/gatewayIdentity";

export type AuthenticatedUser = {
  id: string;
  role: OmniqRole;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

const internalGatewayKey = process.env.INTERNAL_GATEWAY_KEY || "";

/**
 * Removes any x-omniq-* headers supplied by the client. Without this a caller could simply send
 * `x-omniq-user-role: admin` and have it forwarded verbatim to a service that trusts it.
 */
export function stripClientIdentityHeaders(request: Request, _response: Response, next: NextFunction): void {
  for (const header of Object.values(IDENTITY_HEADERS)) {
    delete request.headers[header];
  }
  next();
}

function applyIdentity(request: Request, user: AuthenticatedUser, email?: string): void {
  request.user = user;
  // http-proxy-middleware forwards request.headers, so setting them here propagates downstream.
  request.headers[IDENTITY_HEADERS.userId] = user.id;
  request.headers[IDENTITY_HEADERS.role] = user.role;
  if (email) request.headers[IDENTITY_HEADERS.email] = email;
  if (internalGatewayKey) request.headers[IDENTITY_HEADERS.gatewayKey] = internalGatewayKey;
}

/** Rejects the request unless it carries a valid, signature-verified Supabase access token. */
export async function authMiddleware(request: Request, response: Response, next: NextFunction): Promise<void> {
  const token = bearerFrom(request.headers.authorization);
  if (!token) {
    response.status(401).json(fail("UNAUTHORIZED", "Missing bearer token."));
    return;
  }

  try {
    const verified = await verifyAccessToken(token);
    applyIdentity(request, { id: verified.id, role: verified.role }, verified.email);
    next();
  } catch (error) {
    // Deliberately not echoing the underlying reason to the client.
    console.warn(`[auth] Token rejected: ${(error as Error).message}`);
    response.status(401).json(fail("UNAUTHORIZED", "Invalid or expired token."));
  }
}

/**
 * For public routes that personalise when a token happens to be present. An invalid token is
 * treated as anonymous rather than rejected, so public reads never break on a stale session.
 */
export async function optionalAuthMiddleware(request: Request, _response: Response, next: NextFunction): Promise<void> {
  const token = bearerFrom(request.headers.authorization);
  if (!token) {
    next();
    return;
  }
  try {
    const verified = await verifyAccessToken(token);
    applyIdentity(request, { id: verified.id, role: verified.role }, verified.email);
  } catch {
    // Ignore - caller proceeds as anonymous.
  }
  next();
}
