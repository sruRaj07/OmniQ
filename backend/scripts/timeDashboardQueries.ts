/**
 * OmniQ diagnostics - times each query the admin dashboard fans out, individually.
 *
 * The dashboard answers in ~9s against a database holding 46 orders, so the cost is not row volume.
 * This runs each of its nine queries on its own and prints the wall time, to identify which one
 * dominates. Read-only; safe to run against any environment. Author: OmniQ Team
 */
import { supabaseAdmin } from "../shared/utils/supabaseClient";

async function time(label: string, run: () => PromiseLike<any>): Promise<void> {
  const startedAt = Date.now();
  try {
    const result: any = await run();
    const elapsed = Date.now() - startedAt;
    const size = result?.count ?? (Array.isArray(result?.data) ? result.data.length : "-");
    console.log(`${String(elapsed).padStart(6)}ms  ${label.padEnd(28)} rows/count=${size}${result?.error ? `  ERROR=${result.error.message}` : ""}`);
  } catch (error: any) {
    console.log(`${String(Date.now() - startedAt).padStart(6)}ms  ${label.padEnd(28)} THREW ${error.message}`);
  }
}

async function main(): Promise<void> {
  console.log("--- sequential (isolates per-query cost) ---");
  await time("orders head count", () => supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null));
  await time("orders aggregate scan", () => supabaseAdmin.from("orders").select("subtotal, total, seller_id, status, created_at").is("deleted_at", null).order("created_at", { ascending: false }).range(0, 999));
  await time("sellers approved count", () => supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "approved"));
  await time("sellers pending count", () => supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "pending"));
  await time("sellers suspended count", () => supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "suspended"));
  await time("buyers head count", () => supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer").is("deleted_at", null));
  await time("seller list", () => supabaseAdmin.from("sellers").select("id, business_name, status, city, created_at"));
  await time("flagged products count", () => supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_approved", false));
  await time("pending requests count", () => supabaseAdmin.from("user_requests").select("id", { count: "exact", head: true }).eq("status", "pending"));

  console.log("\n--- products table size (is the count a seq scan?) ---");
  await time("products total count", () => supabaseAdmin.from("products").select("id", { count: "exact", head: true }));
  await time("products planned count", () => supabaseAdmin.from("products").select("id", { count: "planned", head: true }));
  await time("products estimated count", () => supabaseAdmin.from("products").select("id", { count: "estimated", head: true }));

  console.log("\n--- all nine in parallel (what the dashboard actually does) ---");
  const startedAt = Date.now();
  await Promise.all([
    supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabaseAdmin.from("orders").select("subtotal, total, seller_id, status, created_at").is("deleted_at", null).order("created_at", { ascending: false }).range(0, 999),
    supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer").is("deleted_at", null),
    supabaseAdmin.from("sellers").select("id, business_name, status, city, created_at"),
    supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_approved", false),
    supabaseAdmin.from("user_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  console.log(`${String(Date.now() - startedAt).padStart(6)}ms  parallel fan-out total`);
}

main().then(() => process.exit(0));
