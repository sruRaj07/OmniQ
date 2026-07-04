/**
 * OmniQ admin service - admin analytics logic.
 * Author: OmniQ Team
 */
import { moderationSchema, zoneSchema } from "../validators/adminValidator";
import { supabase } from "../../../../shared/utils/supabaseClient";

export async function getDashboard() {
  // We can query Supabase for real analytics here later
  return { gmv: 420000, orders: 1284, activeSellers: 48, registeredBuyers: 5841 };
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
    // Or you could set is_approved = false, or delete the product
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);
    if (error) throw new Error(`Removal failed: ${error.message}`);
    return { id, removed: true };
  }
  
  return { id, status: "unchanged" };
}

export async function upsertZone(input: unknown) {
  const parsed = zoneSchema.parse(input);
  
  // Try to find if zone exists by name
  const { data: existingZone } = await supabase
    .from("delivery_zones")
    .select("id")
    .eq("name", parsed.name)
    .single();

  if (existingZone) {
    const { data, error } = await supabase
      .from("delivery_zones")
      .update({
        lat: parsed.centreLat,
        lng: parsed.centreLng,
        radius_km: parsed.radiusKm,
        supported_pincodes: parsed.pinCodes
      })
      .eq("id", existingZone.id)
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
