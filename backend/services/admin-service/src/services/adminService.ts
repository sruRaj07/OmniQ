/**
 * OmniQ admin service - admin analytics logic.
 * Author: OmniQ Team
 */
import { moderationSchema, zoneSchema } from "../validators/adminValidator";
import { supabase, supabaseAdmin } from "../../../../shared/utils/supabaseClient";

export async function getDashboard() {
  // 1. Orders count
  const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  
  // 2. Fetch all orders for GMV calculation (assuming small dataset for now)
  const { data: orders } = await supabase.from('orders').select('total, seller_id');
  const gmv = (orders || []).reduce((sum, order) => sum + Number(order.total || 0), 0);

  // 3. Active Sellers count
  const { count: activeSellers } = await supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'approved');

  // 4. Pending Sellers count
  const { count: pendingSellers } = await supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'pending');

  // 5. Registered Buyers count
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const registeredBuyers = usersData?.users?.length || 0;

  // 6. Top Sellers (Top 3 by GMV)
  const { data: sellers } = await supabase.from('sellers').select('id, business_name, status, created_at');
  
  const sellerStats: Record<string, { gmv: number, orders: number }> = {};
  (orders || []).forEach(order => {
    if (order.seller_id) {
      if (!sellerStats[order.seller_id]) sellerStats[order.seller_id] = { gmv: 0, orders: 0 };
      sellerStats[order.seller_id].gmv += Number(order.total || 0);
      sellerStats[order.seller_id].orders += 1;
    }
  });

  const topSellers = (sellers || [])
    .map(seller => {
      const stats = sellerStats[seller.id] || { gmv: 0, orders: 0 };
      const hoursSince = Math.floor((new Date().getTime() - new Date(seller.created_at).getTime()) / (1000 * 60 * 60));
      let timeAgo = `${hoursSince}h ago`;
      if (hoursSince > 24) timeAgo = `${Math.floor(hoursSince / 24)}d ago`;

      return {
        id: seller.id,
        name: seller.business_name,
        status: seller.status.toUpperCase(),
        gmv: stats.gmv,
        orders: stats.orders,
        rating: 4.8, // Mocked rating as we don't have a reviews table yet
        timeAgo
      };
    })
    .sort((a, b) => b.gmv - a.gmv) // Sort by GMV descending
    .slice(0, 3); // Top 3

  return {
    gmv,
    orders: ordersCount || 0,
    activeSellers: activeSellers || 0,
    pendingSellers: pendingSellers || 0,
    registeredBuyers,
    topSellers,
    flagged: 0 // Mocked
  };
}

export async function getAnalytics() {
  return { revenueByCategory: { Fashion: 42, Tech: 31, Jewellery: 18 }, topArea: "Koramangala" };
}

import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

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
  }
  
  return { id, status: "unchanged" };
}

export async function upsertZone(input: unknown) {
  const parsed = zoneSchema.parse(input);
  
  if (parsed.id) {
    const { data, error } = await supabase
      .from("delivery_zones")
      .update({
        name: parsed.name,
        lat: parsed.centreLat,
        lng: parsed.centreLng,
        radius_km: parsed.radiusKm,
        supported_pincodes: parsed.pinCodes
      })
      .eq("id", parsed.id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update zone: ${error.message}`);
    return data;
  } else {
    const { data, error } = await supabase
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

export async function listZones() {
  const { data, error } = await supabase.from("delivery_zones").select("*");
  if (error) throw new Error(`Failed to fetch zones: ${error.message}`);
  return data;
}

export async function listAllOrders() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*, product:products(*)), seller:sellers(business_name, owner_id)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data;
}
