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
import dotenv from "dotenv";
import path from "path";

// The monorepo keeps a single .env at the repo root. Services call a bare `dotenv.config()`, which
// resolves against the process cwd - and `pnpm --filter <svc> dev` sets cwd to the service
// directory, where no .env exists. Most services get the variables anyway because supabaseClient.ts
// loads the root file explicitly, but the api-gateway is a pure proxy and never imports it, so in
// local development it saw no EXPO_PUBLIC_SUPABASE_URL, built no verification key, and rejected
// every valid token. Load the same root file here so verification does not depend on which other
// module happened to be imported first. dotenv does not overwrite variables that are already set,
// so real deployment environments (Container Apps) still win.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export type OmniqRole = "buyer" | "seller" | "admin";

export type VerifiedUser = {
  id: string;
  role: OmniqRole;
  email?: string;
};

type VerificationKeys = {
  issuer?: string;
  remoteJwks: ReturnType<typeof createRemoteJWKSet> | null;
  hmacKey: Uint8Array | null;
};

let keys: VerificationKeys | null = null;

// Resolved on first use rather than at module load. Import order then cannot decide whether
// verification works: any dotenv call made by the importing service still counts.
function getKeys(): VerificationKeys {
  if (keys) return keys;

  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const legacySecret = process.env.SUPABASE_JWT_SECRET || "";

  if (!supabaseUrl && !legacySecret) {
    console.warn("[jwtVerifier] Neither EXPO_PUBLIC_SUPABASE_URL nor SUPABASE_JWT_SECRET is set - token verification will fail closed.");
  }

  keys = {
    issuer: supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined,
    // ⚡ PERFORMANCE: createRemoteJWKSet caches the fetched key set in memory and only re-fetches
    // on an unknown `kid` (rate-limited internally by jose). Verification is therefore a local
    // signature check on the hot path, not a network round-trip per request. Memoising the whole
    // struct keeps that cache process-wide instead of rebuilding it per call.
    remoteJwks: supabaseUrl
      ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`), {
          cacheMaxAge: 10 * 60 * 1000,
          cooldownDuration: 30 * 1000
        })
      : null,
    hmacKey: legacySecret ? new TextEncoder().encode(legacySecret) : null
  };
  return keys;
}

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

  const { issuer, remoteJwks, hmacKey } = getKeys();

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
