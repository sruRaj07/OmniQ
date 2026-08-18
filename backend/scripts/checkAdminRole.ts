/**
 * OmniQ ops script - inspect and repair the role claim on an account.
 *
 * The API derives a caller's role from the access token's `app_metadata.role` and ignores
 * `user_metadata` entirely (backend/shared/utils/jwtVerifier.ts). An account carrying the role
 * only in user_metadata reaches the admin console and is then answered 403 on every request, so
 * the console shows zeros and empty lists rather than an access error.
 *
 * This script reports what an account actually holds, and can move the claim to where the API
 * reads it.
 *
 *   pnpm admin:check admin@omniq.in            # report only
 *   pnpm admin:check admin@omniq.in --promote  # set app_metadata.role = "admin"
 *
 * Author: OmniQ Team
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/** listUsers is paginated (50 per page by default); walk every page rather than trusting page 1. */
async function findUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  return null;
}

async function main() {
  const [email, ...flags] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: pnpm admin:check <email> [--promote] [--role admin|seller|buyer]");
    process.exit(1);
  }

  const roleFlagIndex = flags.indexOf("--role");
  const role = roleFlagIndex >= 0 ? flags[roleFlagIndex + 1] : "admin";
  if (!["admin", "seller", "buyer"].includes(role)) {
    console.error(`Unsupported role "${role}". Use admin, seller or buyer.`);
    process.exit(1);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
  }

  const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role ?? null;
  const userRole = (user.user_metadata as Record<string, unknown> | undefined)?.role ?? null;

  console.log(`\nAccount        : ${user.email}`);
  console.log(`User id        : ${user.id}`);
  console.log(`app_metadata   : role = ${JSON.stringify(appRole)}   <-- what the API enforces`);
  console.log(`user_metadata  : role = ${JSON.stringify(userRole)}   (ignored server-side)`);

  if (appRole === "admin") {
    console.log("\nThis account is a working admin: the gateway will accept /admin* requests.\n");
  } else if (userRole === "admin") {
    console.log(
      "\nMISCONFIGURED: the admin role is only in user_metadata. The app will open the admin\n" +
      "console for this account and the API will answer 403 to every request, which renders as\n" +
      "an empty dashboard. Re-run with --promote to fix.\n"
    );
  } else {
    console.log("\nThis account is not an admin.\n");
  }

  if (!flags.includes("--promote")) return;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata as object), role }
  });
  if (error) throw new Error(`Failed to update app_metadata: ${error.message}`);

  console.log(`Set app_metadata.role = "${role}" for ${user.email}.`);
  console.log("The account must sign out and sign in again to mint a token carrying the new claim.\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
