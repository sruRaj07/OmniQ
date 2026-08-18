/**
 * OmniQ admin service - admin analytics logic.
 * Author: OmniQ Team
 */
import { moderationSchema, zoneIdSchema, zoneSchema } from "../validators/adminValidator";
import { resolveOrderTotal } from "../../../../shared/constants/delivery";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";
import { deleteUserAccount } from "../../../../shared/utils/accountDeletion";
import { cached, invalidateCache } from "../utils/microCache";

/**
 * PostgREST returns at most `db.max_rows` per request - 1000 on Supabase by default - and does so
 * silently. A `.select()` with no range therefore does not mean "every row", it means "the first
 * 1000", which is why GMV stopped growing once the platform passed a thousand orders and the
 * dashboard began contradicting the order list.
 *
 * This walks the full result set in pages and stops as soon as a short page proves the end was
 * reached. Callers must select only the columns they aggregate - the point is to move a few numbers
 * per row, not whole records.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 500; // 500k rows: a backstop against an unbounded loop, not an expected limit.

async function scanAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label} failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

type OrderAggregateRow = { subtotal: unknown; total: unknown; seller_id: string | null; status: string | null; created_at: string };

async function computeDashboard() {
  // ⚡ PERFORMANCE: every independent query runs in parallel, so the wall time is one round-trip
  // rather than the sum of six. The order scan is the only one that can page, and it fetches three
  // numeric columns per row rather than whole order records.
  const [
    ordersCountResult,
    orderRows,
    activeSellersResult,
    pendingSellersResult,
    suspendedSellersResult,
    buyersResult,
    sellerRows,
    flaggedResult,
    pendingRequestsResult,
  ] = await Promise.all([
    supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null),
    scanAll<OrderAggregateRow>(
      (from, to) =>
        supabaseAdmin
          .from("orders")
          .select("subtotal, total, seller_id, status, created_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .range(from, to),
      "Order aggregate scan"
    ),
    supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    // Buyer count comes from `profiles`, not `auth.admin.listUsers()`. listUsers is paginated and
    // was being called without a page size, so it returned its 50-row first page and the dashboard
    // reported "50 buyers" no matter how many had signed up. A head count is also exact and
    // transfers no rows, where paging all of auth would be one round-trip per 200 accounts.
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "buyer")
      .is("deleted_at", null),
    supabaseAdmin.from("sellers").select("id, business_name, status, city, created_at"),
    // "Flagged" was hardcoded to 0, so a product taken down never showed up as an action taken.
    supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_approved", false),
    supabaseAdmin.from("user_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  // A count query that errors returns count: null, which would silently render as 0 - the exact
  // failure mode the console is being fixed for. Surface it instead.
  for (const [label, result] of [
    ["order count", ordersCountResult],
    ["active sellers", activeSellersResult],
    ["pending sellers", pendingSellersResult],
    ["suspended sellers", suspendedSellersResult],
    ["buyer count", buyersResult],
    ["seller list", sellerRows],
    ["flagged products", flaggedResult],
    ["pending requests", pendingRequestsResult],
  ] as const) {
    if (result.error) throw new Error(`Dashboard ${label} failed: ${result.error.message}`);
  }

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Single pass over the orders: platform GMV, per-seller GMV, status split and recent windows all
  // come out of one traversal rather than five filters over the same array.
  let gmv = 0;
  let gmv24h = 0;
  let gmv7d = 0;
  let orders24h = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let openOrders = 0;
  const sellerStats: Record<string, { gmv: number; orders: number }> = {};

  for (const order of orderRows) {
    const value = resolveOrderTotal(order.subtotal, order.total);
    const placedAt = new Date(order.created_at).getTime();

    if (order.status === "cancelled") {
      cancelledOrders += 1;
    } else {
      // Cancelled orders are excluded from GMV: money that was never taken is not merchandise
      // value, and counting it made the dashboard total exceed the sum of the order list.
      gmv += value;
      if (placedAt >= weekAgo) gmv7d += value;
      if (placedAt >= dayAgo) {
        gmv24h += value;
        orders24h += 1;
      }
      if (order.status === "delivered") deliveredOrders += 1;
      else openOrders += 1;

      if (order.seller_id) {
        const stat = (sellerStats[order.seller_id] ??= { gmv: 0, orders: 0 });
        stat.gmv += value;
        stat.orders += 1;
      }
    }
  }

  const now = Date.now();
  const topSellers = (sellerRows.data ?? [])
    .map((seller) => {
      const stats = sellerStats[seller.id] ?? { gmv: 0, orders: 0 };
      const hoursSince = Math.floor((now - new Date(seller.created_at).getTime()) / 3_600_000);
      return {
        id: seller.id,
        name: seller.business_name,
        city: seller.city ?? null,
        status: String(seller.status ?? "").toUpperCase(),
        gmv: stats.gmv,
        orders: stats.orders,
        // `rating: 4.8` used to be returned here for every seller. There is no ratings table, so it
        // was a fabricated number on an operations screen. Removed rather than faked.
        timeAgo: hoursSince > 24 ? `${Math.floor(hoursSince / 24)}d ago` : `${hoursSince}h ago`
      };
    })
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);

  return {
    gmv,
    gmv24h,
    gmv7d,
    orders: ordersCountResult.count ?? orderRows.length,
    orders24h,
    deliveredOrders,
    cancelledOrders,
    openOrders,
    activeSellers: activeSellersResult.count ?? 0,
    pendingSellers: pendingSellersResult.count ?? 0,
    suspendedSellers: suspendedSellersResult.count ?? 0,
    registeredBuyers: buyersResult.count ?? 0,
    pendingRequests: pendingRequestsResult.count ?? 0,
    flagged: flaggedResult.count ?? 0,
    topSellers,
    generatedAt: new Date().toISOString()
  };
}

/**
 * ⚡ PERFORMANCE: 15s fresh / 60s stale-while-revalidate. An operator pulling to refresh twice in a
 * row, or two operators watching at once, costs one set of queries - see utils/microCache.
 * Any admin write that changes these numbers calls invalidateCache("dashboard") so an approval is
 * reflected on the next read rather than up to 15s later.
 */
export async function getDashboard(options: { fresh?: boolean } = {}) {
  // Seller approval lives in seller-service, so approving a seller cannot invalidate this cache
  // in-process. Rather than leave the operator looking at a stale pending count for up to 15s, the
  // console asks for `?fresh=1` on the refetch it fires after a mutation. Ordinary reads - mount,
  // tab switch, pull-to-refresh - take the cached path.
  if (options.fresh) invalidateCache("dashboard");
  return cached("dashboard", computeDashboard, { ttlMs: 15_000, staleMs: 45_000 });
}

type AnalyticsItemRow = {
  quantity: unknown;
  subtotal: unknown;
  order: { status: string | null; created_at: string; delivery_address: Record<string, unknown> | null } | null;
  product: { category: string | null } | null;
};

async function computeAnalytics() {
  // This returned a hardcoded object - `{ Fashion: 42, Tech: 31, Jewellery: 18 }` and
  // `topArea: "Koramangala"` - regardless of what was actually on the platform. Anything shown to
  // an operator has to come from the database.
  const items = await scanAll<AnalyticsItemRow>(
    (from, to) =>
      supabaseAdmin
        .from("order_items")
        .select("quantity, subtotal, order:orders!inner(status, created_at, delivery_address), product:products(category)")
        .range(from, to) as any,
    "Analytics scan"
  );

  const revenueByCategory: Record<string, number> = {};
  const unitsByCategory: Record<string, number> = {};
  const revenueByArea: Record<string, number> = {};
  let totalRevenue = 0;

  for (const item of items) {
    if (!item.order || item.order.status === "cancelled") continue;
    const revenue = Number(item.subtotal) || 0;
    const category = item.product?.category?.trim() || "Uncategorised";

    revenueByCategory[category] = (revenueByCategory[category] ?? 0) + revenue;
    unitsByCategory[category] = (unitsByCategory[category] ?? 0) + (Number(item.quantity) || 0);
    totalRevenue += revenue;

    const address = item.order.delivery_address ?? {};
    const area =
      (address.city as string | undefined)?.trim() ||
      (address.state as string | undefined)?.trim() ||
      (address.pincode as string | undefined) ||
      (address.zip as string | undefined);
    if (area) revenueByArea[area] = (revenueByArea[area] ?? 0) + revenue;
  }

  const asRanked = (map: Record<string, number>) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        // Share is computed against the same total the list sums to, so the percentages add to 100.
        share: totalRevenue > 0 ? Math.round((value / totalRevenue) * 1000) / 10 : 0
      }));

  const categories = asRanked(revenueByCategory).map((entry) => ({
    ...entry,
    units: unitsByCategory[entry.name] ?? 0
  }));
  const areas = asRanked(revenueByArea).slice(0, 8);

  return {
    totalRevenue,
    categories,
    areas,
    topArea: areas[0]?.name ?? null,
    generatedAt: new Date().toISOString()
  };
}

/** ⚡ PERFORMANCE: 60s fresh / 5min stale. Analytics is a wider scan and moves far more slowly. */
export async function getAnalytics() {
  return cached("analytics", computeAnalytics, { ttlMs: 60_000, staleMs: 300_000 });
}

export async function moderateProduct(id: string, input: unknown) {
  const parsed = moderationSchema.parse(input);

  // Moderation changes the flagged count the dashboard reports, so the cached aggregate has to go.
  invalidateCache("dashboard");
  invalidateCache("analytics");

  if (parsed.action === "approve") {
    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ is_approved: true })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Approval failed: ${error.message}`);
    return data;
  } else if (parsed.action === "remove") {
    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ is_approved: false })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Removal failed: ${error.message}`);
    return data;
  } else if (parsed.action === "delete") {
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);
    if (error) throw new Error(`Deletion failed: ${error.message}`);
    return { id, deleted: true };
  }
  
  return { id, status: "unchanged" };
}

export async function upsertZone(input: unknown) {
  const parsed = zoneSchema.parse(input);
  
  if (parsed.id) {
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .update({
        name: parsed.name,
        lat: parsed.centreLat,
        lng: parsed.centreLng,
        radius_km: parsed.radiusKm,
        supported_pincodes: parsed.pinCodes
      })
      .eq("id", parsed.id)
      // Scoped to live rows: an edit must not resurrect a zone another admin just removed, which
      // would quietly make its pincodes serviceable again.
      .is("deleted_at", null)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Failed to update zone: ${error.message}`);
    if (!data) throw new Error("Zone not found. It may have been deleted by another admin.");
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .insert({
        name: parsed.name,
        lat: parsed.centreLat,
        lng: parsed.centreLng,
        radius_km: parsed.radiusKm,
        supported_pincodes: parsed.pinCodes
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create zone: ${error.message}`);
    return data;
  }
}

/**
 * Removes a zone. This is a soft delete: `delivery_zones` already carries both `active` and
 * `deleted_at`, and the RLS policy in 007/011 keys off them, so removal is a flag flip rather than
 * a DELETE. That keeps an accidental removal recoverable (a single SQL update restores it) and
 * leaves the row intact for any historic record that refers to the zone it was placed under.
 *
 * Both columns move together: `active` is what checkZone filters on, `deleted_at` records intent.
 */
export async function deleteZone(id: unknown) {
  // safeParse, not parse: a ZodError's `.message` is a serialised JSON array, and the controller
  // puts that straight into the API error the admin console displays.
  const parsedId = zoneIdSchema.safeParse(id);
  if (!parsedId.success) throw new Error("Zone id must be a valid uuid.");
  const zoneId = parsedId.data;

  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", zoneId)
    // Matching only live rows is what makes this idempotent - see below.
    .is("deleted_at", null)
    .select("id, name, supported_pincodes")
    .maybeSingle();

  if (error) throw new Error(`Failed to delete zone: ${error.message}`);

  // Deleting an already-deleted zone matches no row. That is the desired end state, so a double-tap
  // or a retried request reports success instead of a spurious failure. `alreadyDeleted` lets the
  // caller tell the two apart without having to re-read the table.
  if (!data) return { id: zoneId, deleted: true, alreadyDeleted: true };
  return { ...data, deleted: true, alreadyDeleted: false };
}

export async function listZones() {
  // Soft-deleted zones stay in the table for recovery and must never reach the console.
  //
  // ⚡ PERFORMANCE: explicit columns rather than `*` (drops created_by/deleted_at from the payload),
  // and an explicit order. Postgres gives no ordering guarantee without ORDER BY, so the zone cards
  // could reshuffle on any refetch - the admin would watch the list reorder itself after every
  // pincode edit. Ordering server-side also keeps the client off a sort on every render.
  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("id, name, lat, lng, radius_km, supported_pincodes, active, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch zones: ${error.message}`);
  return data;
}

/**
 * Products taken down by moderation. The route for this returned a hardcoded `[]`, so the console's
 * "flagged" surface was permanently empty and a removed product could not be found again to
 * restore it.
 */
export async function listFlaggedProducts(limit = 50) {
  const { data, error, count } = await supabaseAdmin
    .from("products")
    .select("id, title, price, category, images, is_approved, created_at, seller:sellers(id, business_name, city)", {
      count: "exact"
    })
    .eq("is_approved", false)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(0, Math.min(Math.max(limit, 1), 100) - 1);

  if (error) throw new Error(`Failed to fetch flagged products: ${error.message}`);
  return { rows: data ?? [], total: count ?? (data?.length ?? 0) };
}

/**
 * Recent entries from `public.audit_log` (migration 001). Also previously a hardcoded `[]`.
 */
export async function listAuditLog(limit = 50) {
  const { data, error, count } = await supabaseAdmin
    .from("audit_log")
    .select("id, action, target_type, target_id, metadata, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, role)", {
      count: "exact"
    })
    .order("created_at", { ascending: false })
    .range(0, Math.min(Math.max(limit, 1), 200) - 1);

  if (error) throw new Error(`Failed to fetch audit log: ${error.message}`);
  return { rows: data ?? [], total: count ?? (data?.length ?? 0) };
}

export type ListOrdersOptions = {
  limit?: number;
  offset?: number;
  /** "active" = everything not delivered or cancelled; "delivered"; "cancelled"; or a literal status. */
  status?: string;
  /** Matches an order id prefix, so pasting the #ABCD1234 shown on a card finds that order. */
  search?: string;
};

const ORDER_LIST_MAX_LIMIT = 100;
const ORDER_LIST_DEFAULT_LIMIT = 25;

/**
 * ⚡ PERFORMANCE: this used to select `*` with three levels of nested joins - order_items, each
 * item's full product row, each product's seller, plus the order's own seller and buyer - for
 * every order on the platform, with no range. On a large table PostgREST truncated it at 1000 rows
 * anyway, so the response was simultaneously enormous and incomplete, and the client then held all
 * of it in memory and filtered in JS.
 *
 * Now: filtering and paging happen in Postgres, only the columns actually rendered are selected,
 * and the total count comes back alongside so the console can show "showing 25 of 812" without a
 * second query.
 */
export async function listAllOrders(options: ListOrdersOptions = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || ORDER_LIST_DEFAULT_LIMIT, 1), ORDER_LIST_MAX_LIMIT);
  const offset = Math.max(Number(options.offset) || 0, 0);

  let query = supabaseAdmin
    .from("orders")
    .select(
      "id, status, subtotal, total, platform_fee, payment_method, delivery_address, created_at, seller_id, " +
        "order_items(quantity, subtotal, product:products(title, category, seller:sellers(id, business_name, city))), " +
        "seller:sellers(id, business_name, owner_id, city, category), " +
        "buyer:profiles!orders_buyer_id_fkey(full_name, phone_number)",
      { count: "exact" }
    )
    .is("deleted_at", null);

  const status = options.status?.trim();
  if (status === "active") {
    query = query.not("status", "in", "(delivered,cancelled)");
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const search = options.search?.trim();
  if (search) {
    // Order ids are uuids and the console shows the leading 8 characters, so a prefix match is what
    // an operator can actually type. `%` and `,` are stripped: unescaped they would alter the
    // PostgREST filter expression rather than being matched literally.
    const safe = search.replace(/[%,()]/g, "");
    if (safe) query = query.ilike("id", `${safe}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);

  const rows = data ?? [];
  return {
    rows,
    total: count ?? rows.length,
    limit,
    offset,
    hasMore: offset + rows.length < (count ?? rows.length)
  };
}

/**
 * List all user requests (data export, account deletion) with user profile info.
 */
export async function listUserRequests(status?: string) {
  let query = supabaseAdmin
    .from("user_requests")
    .select("*, profile:profiles!user_requests_user_id_fkey(full_name, email, phone_number)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch user requests: ${error.message}`);
  return data || [];
}

/**
 * Approve or reject a user request.
 */
export async function actionUserRequest(requestId: string, status: string, adminNotes?: string) {
  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Status must be 'approved' or 'rejected'.");
  }

  // Actioning a request moves the pending-request count, and approving a deletion anonymises orders
  // and clears a profile - both feed the dashboard aggregate.
  invalidateCache("dashboard");

  if (status === "rejected") {
    const { data, error } = await supabaseAdmin
      .from("user_requests")
      .delete()
      .eq("id", requestId)
      .select("*, profile:profiles!user_requests_user_id_fkey(full_name, email)")
      .single();

    if (error) throw new Error(`Failed to delete rejected request: ${error.message}`);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("user_requests")
    .update({
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", requestId)
    .select("*, profile:profiles!user_requests_user_id_fkey(full_name, email)")
    .single();

  if (error) throw new Error(`Failed to update request: ${error.message}`);

  // Approving an account_deletion request carries it out for real.
  //
  // The previous version called `auth.admin.deleteUser` and, on failure, logged the error and
  // returned success anyway - so the request showed as approved while the account was still live,
  // and the person had been told their data was gone. It also could not succeed at all for a seller
  // with orders: `orders.seller_id` is `on delete restrict`, so Postgres refuses the cascade.
  // Both are handled by the shared routine, which throws rather than pretending.
  if (status === "approved" && data.type === "account_deletion") {
    // Anonymising orders and clearing the profile also removes this request row (it cascades from
    // profiles), so capture what the caller needs before the deletion runs.
    const summary = { ...data };
    const result = await deleteUserAccount(supabaseAdmin, data.user_id, "admin_approved");
    return {
      ...summary,
      status: "completed",
      deletion: {
        ordersAnonymised: result.ordersAnonymised,
        sellerDetached: result.sellerDetached,
        completedAt: result.completedAt
      }
    };
  }

  return data;
}
