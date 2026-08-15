/**
 * OmniQ shared package - Supabase access token verification.
 * Author: OmniQ Team
 *
 * Replaces the previous decode-only handling. A decoded-but-unverified JWT is
 * attacker-controlled: anyone could mint `{ sub: <any user>, app_metadata: { role: "admin" } }`
 * and be trusted. Every token that reaches a protected route is now signature-checked.
 *
 * This Supabase project publishes an ES256 JWKS at /auth/v1/.well-known/jwks.json, so the
 * primary path needs no shared secret. Projects that have not migrated to asymmetric signing
 * keys still issue HS256 tokens; SUPABASE_JWT_SECRET covers that case. If neither path can
 * verify, the token is rejected — there is no decode-only fallback.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type OmniqRole = "buyer" | "seller" | "admin";

export type VerifiedUser = {
  id: string;
  role: OmniqRole;
  email?: string;
};

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const legacySecret = process.env.SUPABASE_JWT_SECRET || "";

if (!supabaseUrl) {
  console.warn("[jwtVerifier] EXPO_PUBLIC_SUPABASE_URL is not set - token verification will fail closed.");
}

const issuer = supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined;

// ⚡ PERFORMANCE: createRemoteJWKSet caches the fetched key set in memory and only re-fetches
// on an unknown `kid` (rate-limited internally by jose). Verification is therefore a local
// signature check on the hot path, not a network round-trip per request.
const remoteJwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`), {
      cacheMaxAge: 10 * 60 * 1000,
      cooldownDuration: 30 * 1000
    })
  : null;

const hmacKey = legacySecret ? new TextEncoder().encode(legacySecret) : null;

function normaliseRole(payload: JWTPayload): OmniqRole {
  // Supabase puts privileged claims under app_metadata (server-controlled). user_metadata is
  // user-writable via the client SDK and must never be trusted for authorisation.
  const appMetadata = (payload as any).app_metadata;
  const claimed = appMetadata?.role;
  if (claimed === "admin") return "admin";
  if (claimed === "seller") return "seller";
  return "buyer";
}

function toVerifiedUser(payload: JWTPayload): VerifiedUser {
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Token payload is missing a subject claim.");
  }
  return {
    id: payload.sub,
    role: normaliseRole(payload),
    email: typeof (payload as any).email === "string" ? (payload as any).email : undefined
  };
}

/**
 * Verifies a Supabase access token and returns the trusted identity.
 * Throws when the token is absent, malformed, expired, or fails signature verification.
 */
export async function verifyAccessToken(token: string): Promise<VerifiedUser> {
  if (!token) throw new Error("Missing access token.");

  const options = {
    issuer,
    // Supabase issues user tokens with aud "authenticated".
    audience: "authenticated"
  } as const;

  let lastError: unknown;

  if (remoteJwks) {
    try {
      const { payload } = await jwtVerify(token, remoteJwks, options);
      return toVerifiedUser(payload);
    } catch (error) {
      lastError = error;
    }
  }

  if (hmacKey) {
    try {
      const { payload } = await jwtVerify(token, hmacKey, { ...options, algorithms: ["HS256"] });
      return toVerifiedUser(payload);
    } catch (error) {
      lastError = error;
    }
  }

  // Fail closed. Never fall back to decoding an unverified payload.
  throw new Error(`Access token verification failed: ${(lastError as Error)?.message ?? "no verification key available"}`);
}

/** Extracts a bearer token from an Authorization header value. Returns null when absent. */
export function bearerFrom(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
