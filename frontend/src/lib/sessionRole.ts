/**
 * OmniQ mobile app - reads the role the backend will actually enforce.
 *
 * The gateway derives a caller's role from the access token's `app_metadata.role`
 * (backend/shared/utils/jwtVerifier.ts). `user_metadata` is writable by the client SDK, so it is
 * deliberately ignored server-side.
 *
 * The admin login screen used to gate on `user_metadata.role`. An account holding the role only
 * there - which is how backend/scripts/seedDemoData.ts provisions users - passed the client check,
 * landed in the admin console, and then had every `/admin*` request answered 403. The console
 * rendered that as zeros and empty lists, so it looked like a platform with no data rather than an
 * account without permission. Reading the same claim the server reads keeps the two in agreement.
 *
 * Author: OmniQ Team
 */
import type { Session } from "@supabase/supabase-js";

export type OmniqRole = "buyer" | "seller" | "admin";

function decodeBase64Url(value: string): string | null {
  const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), "=");
  try {
    if (typeof globalThis.atob === "function") return globalThis.atob(padded);
    const maybeBuffer = (globalThis as any).Buffer;
    if (maybeBuffer?.from) return maybeBuffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
  return null;
}

function normalise(claimed: unknown): OmniqRole {
  if (claimed === "admin") return "admin";
  if (claimed === "seller") return "seller";
  return "buyer";
}

/**
 * The role carried by an access token's `app_metadata`. Decode-only and never used for
 * authorisation here - the server verifies the signature. This only decides which screen to show,
 * so that the app's routing matches what the API will permit.
 */
export function roleFromAccessToken(accessToken: string | null | undefined): OmniqRole {
  if (!accessToken) return "buyer";
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return "buyer";
    const json = decodeBase64Url(payload);
    if (!json) return "buyer";
    return normalise(JSON.parse(json)?.app_metadata?.role);
  } catch {
    return "buyer";
  }
}

/**
 * Role for a session. Prefers the token claim, because that is the exact value the gateway will
 * read; falls back to the session user's `app_metadata` when the token cannot be decoded.
 */
export function roleFromSession(session: Session | null | undefined): OmniqRole {
  if (!session) return "buyer";
  const fromToken = roleFromAccessToken(session.access_token);
  if (fromToken !== "buyer") return fromToken;
  return normalise((session.user?.app_metadata as Record<string, unknown> | undefined)?.role);
}
