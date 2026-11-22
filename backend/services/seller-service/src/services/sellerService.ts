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
 * Safely attaches assigned_warehouse info from delivery_zones to a seller object.
 * Does not depend on PostgREST foreign key schema cache so it never fails with PGRST200.
 */
export async function attachWarehouseToSeller(seller: any) {
  if (!seller) return seller;
  if (seller.assigned_warehouse) return seller;
  if (!seller.assigned_warehouse_id) {
    seller.assigned_warehouse = null;
    return seller;
  }
  try {
    const { data: wh } = await supabaseAdmin
      .from("delivery_zones")
      .select("id, name, lat, lng, radius_km")
      .eq("id", seller.assigned_warehouse_id)
      .maybeSingle();
    seller.assigned_warehouse = wh || null;
  } catch {
    seller.assigned_warehouse = null;
  }
  return seller;
}

/**
 * Safely attaches assigned_warehouse info to an array of sellers.
 */
export async function attachWarehousesToSellers(sellers: any[]) {
  if (!sellers || sellers.length === 0) return sellers;
  const whIds = Array.from(new Set(sellers.map((s) => s.assigned_warehouse_id).filter(Boolean)));
  if (whIds.length === 0) {
    return sellers.map((s) => ({ ...s, assigned_warehouse: null }));
  }
  try {
    const { data: warehouses } = await supabaseAdmin
      .from("delivery_zones")
      .select("id, name, lat, lng, radius_km")
      .in("id", whIds);
    const map = new Map((warehouses || []).map((w) => [w.id, w]));
    return sellers.map((s) => ({
      ...s,
      assigned_warehouse: s.assigned_warehouse_id ? map.get(s.assigned_warehouse_id) || null : null
    }));
  } catch {
    return sellers;
  }
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

  // 1. If coordinates are provided and valid, calculate physical distance to all calibrated warehouses
  if (coords?.lat !== undefined && coords?.lng !== undefined && !isNaN(coords.lat) && !isNaN(coords.lng)) {
    let closestZone: any = null;
    let minDistance = Infinity;

    for (const zone of zones) {
      const zoneLat = Number(zone.lat);
      const zoneLng = Number(zone.lng);
      // Only measure distance if warehouse has non-zero calibrated coordinates
      if (!isNaN(zoneLat) && !isNaN(zoneLng) && (zoneLat !== 0 || zoneLng !== 0)) {
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

  // 2. If coordinates are missing/uncalibrated, match by city name
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

  // 3. Fallback: If any active warehouse exists, pick the first active one
  if (zones.length > 0) {
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

  let result = await supabaseAdmin.from("sellers").insert(insertPayload).select("*").single();

  // If insert failed due to columns not existing in DB yet, strip new columns and retry
  if (result.error && result.error.code === "PGRST204") {
    delete insertPayload.lat;
    delete insertPayload.lng;
    delete insertPayload.assigned_warehouse_id;
    result = await supabaseAdmin.from("sellers").insert(insertPayload).select("*").single();
  }

  if (result.error) throw new Error(`Failed to register seller: ${result.error.message}`);
  return attachWarehouseToSeller(result.data);
}

export async function listSellers() {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch sellers: ${error.message}`);
  return attachWarehousesToSellers(data || []);
}

export async function getSellerById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch seller: ${error.message}`);
  return attachWarehouseToSeller(data);
}

export async function getSellerByOwnerId(ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch seller profile: ${error.message}`);
  }

  return attachWarehouseToSeller(data);
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

  // When approving a seller or clicking auto-link, if they don't have an assigned warehouse yet, auto-assign one
  if (parsed.status === "approved") {
    const { data: seller } = await supabaseAdmin
      .from("sellers")
      .select("id, lat, lng, city, assigned_warehouse_id")
      .eq("id", id)
      .maybeSingle();

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

  let result = await supabaseAdmin
    .from("sellers")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  // If column does not exist yet (PGRST204), remove assigned_warehouse_id and retry
  if (result.error && result.error.code === "PGRST204" && updatePayload.assigned_warehouse_id) {
    delete updatePayload.assigned_warehouse_id;
    result = await supabaseAdmin
      .from("sellers")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();
  }

  if (result.error) throw new Error(`Failed to update seller status: ${result.error.message}`);
  return attachWarehouseToSeller(result.data);
}

export async function updateSellerProfile(ownerId: string, input: unknown) {
  const parsed = sellerUpdateProfileSchema.parse(input);

  const updatePayload: any = {};
  if (parsed.description !== undefined) updatePayload.description = parsed.description;
  if (parsed.city !== undefined) updatePayload.city = parsed.city;
  if (parsed.lat !== undefined) updatePayload.lat = parsed.lat;
  if (parsed.lng !== undefined) updatePayload.lng = parsed.lng;
  if (parsed.assignedWarehouseId !== undefined) updatePayload.assigned_warehouse_id = parsed.assignedWarehouseId;

  // If coordinates or city were provided and warehouse not explicitly passed, recalculate nearest warehouse
  if (!parsed.assignedWarehouseId && (parsed.lat !== undefined || parsed.city !== undefined)) {
    const { data: currentSeller } = await supabaseAdmin
      .from("sellers")
      .select("city, lat, lng")
      .eq("owner_id", ownerId)
      .maybeSingle();

    const targetCoords =
      parsed.lat !== undefined && parsed.lng !== undefined
        ? { lat: parsed.lat, lng: parsed.lng }
        : currentSeller?.lat && currentSeller?.lng
        ? { lat: Number(currentSeller.lat), lng: Number(currentSeller.lng) }
        : null;

    const targetCity = parsed.city || currentSeller?.city;

    const nearest = await findNearestWarehouse(targetCoords, targetCity);
    if (nearest) {
      updatePayload.assigned_warehouse_id = nearest.id;
    }
  }

  let result = await supabaseAdmin
    .from("sellers")
    .update(updatePayload)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  // If new columns not migrated yet, strip them and update basic profile
  if (result.error && result.error.code === "PGRST204") {
    delete updatePayload.lat;
    delete updatePayload.lng;
    delete updatePayload.assigned_warehouse_id;
    result = await supabaseAdmin
      .from("sellers")
      .update(updatePayload)
      .eq("owner_id", ownerId)
      .select("*")
      .single();
  }

  if (result.error) throw new Error(`Failed to update seller profile: ${result.error.message}`);
  return attachWarehouseToSeller(result.data);
}

/**
 * Assigns a specific warehouse directly to a seller (Admin action).
 */
export async function assignWarehouseToSeller(sellerId: string, warehouseId: string) {
  let result = await supabaseAdmin
    .from("sellers")
    .update({ assigned_warehouse_id: warehouseId })
    .eq("id", sellerId)
    .select("*")
    .single();

  if (result.error) throw new Error(`Failed to assign warehouse to seller: ${result.error.message}`);
  return attachWarehouseToSeller(result.data);
}

/**
 * Retroactive assignment: scans all sellers without an assigned warehouse
 * and auto-assigns the nearest active warehouse by coordinates or city.
 */
export async function bulkAssignWarehouses() {
  const { data: sellers, error: sellerErr } = await supabaseAdmin
    .from("sellers")
    .select("*");

  if (sellerErr) throw new Error(`Failed to fetch sellers: ${sellerErr.message}`);
  if (!sellers || sellers.length === 0) {
    return { total: 0, updated: 0, unassigned: 0, message: "No sellers found." };
  }

  const unassigned = sellers.filter((s) => !s.assigned_warehouse_id);
  if (unassigned.length === 0) {
    return { total: sellers.length, updated: 0, unassigned: 0, message: "All sellers already have assigned warehouses." };
  }

  let updatedCount = 0;
  let unassignedCount = 0;

  for (const seller of unassigned) {
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
