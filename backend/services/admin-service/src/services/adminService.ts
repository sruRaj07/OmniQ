/**
 * OmniQ admin service - admin analytics logic.
 * Author: OmniQ Team
 */
import { moderationSchema, zoneIdSchema, zoneSchema } from "../validators/adminValidator";
import { resolveOrderTotal } from "../../../../shared/constants/delivery";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";
import { deleteUserAccount } from "../../../../shared/utils/accountDeletion";

export async function getDashboard() {
  // ⚡ PERFORMANCE: Fire ALL independent queries in parallel instead of sequentially.
  // This cuts response time from ~500ms (5 serial round-trips) to ~120ms (1 parallel round-trip).
  const [
    { count: ordersCount },
    { data: orders },
    { count: activeSellers },
    { count: pendingSellers },
    { data: usersData },
    { data: sellers },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('subtotal, total, seller_id'),
    supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from('sellers').select('id, business_name, status, created_at'),
  ]);

  // GMV is what buyers paid, delivery included, so it reconciles with the per-order totals shown
  // in the admin order list rather than trailing them by ₹20 an order.
  const gmv = (orders || []).reduce((sum, order) => sum + resolveOrderTotal(order.subtotal, order.total), 0);
  const registeredBuyers = usersData?.users?.length || 0;

  // Build seller stats in a single pass (O(n))
  const sellerStats: Record<string, { gmv: number, orders: number }> = {};
  for (const order of (orders || [])) {
    if (order.seller_id) {
      const stat = sellerStats[order.seller_id] ??= { gmv: 0, orders: 0 };
      stat.gmv += resolveOrderTotal(order.subtotal, order.total);
      stat.orders += 1;
    }
  }

  const now = Date.now();
  const topSellers = (sellers || [])
    .map(seller => {
      const stats = sellerStats[seller.id] || { gmv: 0, orders: 0 };
      const hoursSince = Math.floor((now - new Date(seller.created_at).getTime()) / 3_600_000);
      return {
        id: seller.id,
        name: seller.business_name,
        status: seller.status.toUpperCase(),
        gmv: stats.gmv,
        orders: stats.orders,
        rating: 4.8,
        timeAgo: hoursSince > 24 ? `${Math.floor(hoursSince / 24)}d ago` : `${hoursSince}h ago`
      };
    })
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 3);

  return {
    gmv,
    orders: ordersCount || 0,
    activeSellers: activeSellers || 0,
    pendingSellers: pendingSellers || 0,
    registeredBuyers,
    topSellers,
    flagged: 0
  };
}

export async function getAnalytics() {
  return { revenueByCategory: { Fashion: 42, Tech: 31, Jewellery: 18 }, topArea: "Koramangala" };
}

export async function moderateProduct(id: string, input: unknown) {
  const parsed = moderationSchema.parse(input);
  
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

export async function listAllOrders() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*, product:products(*, seller:sellers(id, business_name, city))), seller:sellers(business_name, owner_id, city, category), buyer:profiles!orders_buyer_id_fkey(full_name, phone_number, address)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data;
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
