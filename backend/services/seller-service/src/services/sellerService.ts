/**
 * OmniQ seller service - seller business logic.
 * Author: OmniQ Team
 */
import { sellerRegistrationSchema, sellerStatusSchema, sellerUpdateProfileSchema } from "../validators/sellerValidator";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

export function distanceKm(point: { lat: number; lng: number }, centre: { lat: number; lng: number }): number {
  const toRad = (value: number): number => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(centre.lat - point.lat);
  const dLng = toRad(centre.lng - point.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point.lat)) * Math.cos(toRad(centre.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds the nearest active warehouse (delivery_zone) for a given location or city.
 */
export async function findNearestWarehouse(
  coords?: { lat?: number; lng?: number } | null,
  city?: string | null
): Promise<{ id: string; name: string; lat: number; lng: number; distanceKm: number } | null> {
  const { data: zones, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("id, name, lat, lng, radius_km, supported_pincodes")
    .eq("active", true)
    .is("deleted_at", null);

  if (error || !zones || zones.length === 0) return null;

  // 1. If coordinates are provided and valid, calculate physical distance to all warehouses
  if (coords?.lat !== undefined && coords?.lng !== undefined && !isNaN(coords.lat) && !isNaN(coords.lng)) {
    let closestZone: any = null;
    let minDistance = Infinity;

    for (const zone of zones) {
      const zoneLat = Number(zone.lat);
      const zoneLng = Number(zone.lng);
      if (!isNaN(zoneLat) && !isNaN(zoneLng)) {
        const dist = distanceKm({ lat: coords.lat, lng: coords.lng }, { lat: zoneLat, lng: zoneLng });
        if (dist < minDistance) {
          minDistance = dist;
          closestZone = zone;
        }
      }
    }

    if (closestZone) {
      return {
        id: closestZone.id,
        name: closestZone.name,
        lat: Number(closestZone.lat),
        lng: Number(closestZone.lng),
        distanceKm: Number(minDistance.toFixed(2))
      };
    }
  }

  // 2. If coordinates are missing or invalid, match by city name
  if (city && city.trim()) {
    const cleanCity = city.trim().toLowerCase();
    const matched = zones.find((z) => {
      const zName = String(z.name || "").trim().toLowerCase();
      return zName === cleanCity || zName.includes(cleanCity) || cleanCity.includes(zName);
    });

    if (matched) {
      return {
        id: matched.id,
        name: matched.name,
        lat: Number(matched.lat),
        lng: Number(matched.lng),
        distanceKm: 0
      };
    }
  }

  // 3. Fallback: If only 1 active warehouse exists, default to it
  if (zones.length === 1) {
    const defaultZone = zones[0];
    return {
      id: defaultZone.id,
      name: defaultZone.name,
      lat: Number(defaultZone.lat),
      lng: Number(defaultZone.lng),
      distanceKm: 0
    };
  }

  return null;
}

export async function registerSeller(ownerId: string, input: unknown) {
  const parsed = sellerRegistrationSchema.parse(input);

  // Auto-resolve nearest warehouse based on seller's location or city
  let assignedWarehouseId = parsed.assignedWarehouseId || null;
  if (!assignedWarehouseId) {
    const nearest = await findNearestWarehouse(
      parsed.lat !== undefined && parsed.lng !== undefined ? { lat: parsed.lat, lng: parsed.lng } : null,
      parsed.city
    );
    if (nearest) {
      assignedWarehouseId = nearest.id;
    }
  }

  const insertPayload: any = {
    owner_id: ownerId,
    business_name: parsed.businessName,
    description: parsed.description,
    gst_number: parsed.gstNumber,
    category: parsed.category,
    city: parsed.city,
    status: "pending"
  };

  if (parsed.lat !== undefined) insertPayload.lat = parsed.lat;
  if (parsed.lng !== undefined) insertPayload.lng = parsed.lng;
  if (assignedWarehouseId) insertPayload.assigned_warehouse_id = assignedWarehouseId;

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .insert(insertPayload)
    .select("*, assigned_warehouse:delivery_zones(id, name, lat, lng)")
    .single();

  if (error) {
    // If selecting assigned_warehouse join fails on older postgrest cache, retry basic select
    const fallback = await supabaseAdmin
      .from("sellers")
      .insert(insertPayload)
      .select()
      .single();
    if (fallback.error) throw new Error(`Failed to register seller: ${fallback.error.message}`);
    return fallback.data;
  }

  return data;
}

export async function listSellers() {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*, assigned_warehouse:delivery_zones(id, name, lat, lng)")
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback if relation not yet cached
    const fallback = await supabaseAdmin.from("sellers").select("*").order("created_at", { ascending: false });
    if (fallback.error) throw new Error(`Failed to fetch sellers: ${fallback.error.message}`);
    return fallback.data;
  }

  return data;
}

export async function getSellerById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*, assigned_warehouse:delivery_zones(id, name, lat, lng)")
    .eq("id", id)
    .single();

  if (error) {
    const fallback = await supabaseAdmin.from("sellers").select("*").eq("id", id).single();
    if (fallback.error) throw new Error(`Failed to fetch seller: ${fallback.error.message}`);
    return fallback.data;
  }

  return data;
}

export async function getSellerByOwnerId(ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*, assigned_warehouse:delivery_zones(id, name, lat, lng)")
    .eq("owner_id", ownerId)
    .single();

  if (error && error.code !== "PGRST116") {
    const fallback = await supabaseAdmin.from("sellers").select("*").eq("owner_id", ownerId).single();
    if (fallback.error && fallback.error.code !== "PGRST116") {
      throw new Error(`Failed to fetch seller profile: ${fallback.error.message}`);
    }
    return fallback.data;
  }

  return data;
}

export async function updateSellerStatus(id: string, input: unknown) {
  const parsed = sellerStatusSchema.parse(input);

  const updatePayload: any = {
    status: parsed.status,
    rejection_reason: parsed.rejectionReason
  };

  if (parsed.assignedWarehouseId) {
    updatePayload.assigned_warehouse_id = parsed.assignedWarehouseId;
  }

  // When approving a seller, if they don't have an assigned warehouse yet, auto-assign one
  if (parsed.status === "approved") {
    const { data: seller } = await supabaseAdmin.from("sellers").select("id, lat, lng, city, assigned_warehouse_id").eq("id", id).maybeSingle();
    if (seller && !seller.assigned_warehouse_id) {
      const nearest = await findNearestWarehouse(
        seller.lat && seller.lng ? { lat: Number(seller.lat), lng: Number(seller.lng) } : null,
        seller.city
      );
      if (nearest) {
        updatePayload.assigned_warehouse_id = nearest.id;
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .update(updatePayload)
    .eq("id", id)
    .select("*, assigned_warehouse:delivery_zones(id, name, lat, lng)")
    .single();

  if (error) throw new Error(`Failed to update seller status: ${error.message}`);
  return data;
}

export async function updateSellerProfile(ownerId: string, input: unknown) {
  const parsed = sellerUpdateProfileSchema.parse(input);

  const updatePayload: any = {};
  if (parsed.description !== undefined) updatePayload.description = parsed.description;
  if (parsed.lat !== undefined) updatePayload.lat = parsed.lat;
  if (parsed.lng !== undefined) updatePayload.lng = parsed.lng;
  if (parsed.assignedWarehouseId !== undefined) updatePayload.assigned_warehouse_id = parsed.assignedWarehouseId;

  // If coordinates were updated, recalculate nearest warehouse
  if (parsed.lat !== undefined && parsed.lng !== undefined && !parsed.assignedWarehouseId) {
    const { data: currentSeller } = await supabaseAdmin.from("sellers").select("city").eq("owner_id", ownerId).maybeSingle();
    const nearest = await findNearestWarehouse({ lat: parsed.lat, lng: parsed.lng }, currentSeller?.city);
    if (nearest) {
      updatePayload.assigned_warehouse_id = nearest.id;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .update(updatePayload)
    .eq("owner_id", ownerId)
    .select("*, assigned_warehouse:delivery_zones(id, name, lat, lng)")
    .single();

  if (error) throw new Error(`Failed to update seller profile: ${error.message}`);
  return data;
}

/**
 * Assigns a specific warehouse directly to a seller (Admin action).
 */
export async function assignWarehouseToSeller(sellerId: string, warehouseId: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .update({ assigned_warehouse_id: warehouseId })
    .eq("id", sellerId)
    .select("*, assigned_warehouse:delivery_zones(id, name, lat, lng)")
    .single();

  if (error) throw new Error(`Failed to assign warehouse to seller: ${error.message}`);
  return data;
}

/**
 * Retroactive assignment: scans all sellers without an assigned warehouse
 * and auto-assigns the nearest active warehouse by coordinates or city.
 */
export async function bulkAssignWarehouses() {
  const { data: sellers, error: sellerErr } = await supabaseAdmin
    .from("sellers")
    .select("id, business_name, city, lat, lng, assigned_warehouse_id")
    .is("assigned_warehouse_id", null);

  if (sellerErr) throw new Error(`Failed to fetch unassigned sellers: ${sellerErr.message}`);
  if (!sellers || sellers.length === 0) {
    return { total: 0, updated: 0, unassigned: 0, message: "All sellers already have assigned warehouses." };
  }

  let updatedCount = 0;
  let unassignedCount = 0;

  for (const seller of sellers) {
    const coords =
      seller.lat !== null && seller.lng !== null && !isNaN(Number(seller.lat)) && !isNaN(Number(seller.lng))
        ? { lat: Number(seller.lat), lng: Number(seller.lng) }
        : null;

    const nearest = await findNearestWarehouse(coords, seller.city);
    if (nearest) {
      const { error: updateErr } = await supabaseAdmin
        .from("sellers")
        .update({ assigned_warehouse_id: nearest.id })
        .eq("id", seller.id);

      if (!updateErr) {
        updatedCount += 1;
      } else {
        unassignedCount += 1;
      }
    } else {
      unassignedCount += 1;
    }
  }

  return {
    total: sellers.length,
    updated: updatedCount,
    unassigned: unassignedCount,
    message: `Successfully assigned ${updatedCount} seller(s) to nearest warehouse. ${unassignedCount} remain unassigned.`
  };
}

