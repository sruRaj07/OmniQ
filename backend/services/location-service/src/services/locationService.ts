/**
 * OmniQ location service - delivery zone logic.
 * Author: OmniQ Team
 */
import { pincodeSchema, zoneCheckSchema } from "../validators/locationValidator";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

export type PincodeLocation = { pincode: string; city: string; district: string; state: string };

// ⚡ PERFORMANCE: Indian pincode -> city/state mapping never changes, so a resolved lookup is
// cached for the lifetime of the process. This keeps checkout off the network for repeat
// pincodes (the common case: one buyer, one delivery area) and shields us from India Post
// rate limits. Misses are not cached so a transient upstream failure can be retried.
const pincodeCache = new Map<string, PincodeLocation>();
const PINCODE_LOOKUP_TIMEOUT_MS = 4000;

function distanceKm(point: { lat: number; lng: number }, centre: { lat: number; lng: number }): number {
  const toRad = (value: number): number => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(centre.lat - point.lat);
  const dLng = toRad(centre.lng - point.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point.lat)) * Math.cos(toRad(centre.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function lookupPincode(input: unknown): Promise<PincodeLocation | null> {
  const pincode = pincodeSchema.parse(input);

  const cached = pincodeCache.get(pincode);
  if (cached) return cached;

  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
    signal: AbortSignal.timeout(PINCODE_LOOKUP_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Pincode directory returned ${response.status}`);

  const payload = (await response.json()) as any[];
  const entry = Array.isArray(payload) ? payload[0] : null;
  const postOffice = entry?.Status === "Success" ? entry?.PostOffice?.[0] : null;
  if (!postOffice) return null;

  const resolved: PincodeLocation = {
    pincode,
    // District is the administrative city for delivery purposes; Block/Name is the locality.
    city: String(postOffice.District ?? postOffice.Block ?? postOffice.Name ?? "").trim(),
    district: String(postOffice.District ?? "").trim(),
    state: String(postOffice.State ?? "").trim()
  };
  if (!resolved.city || !resolved.state) return null;

  pincodeCache.set(pincode, resolved);
  return resolved;
}

export async function checkZone(input: unknown) {
  const parsed = zoneCheckSchema.parse(input);
  
  // Fetch all active delivery zones from Supabase.
  //
  // `deleted_at` is checked as well as `active`, not instead of it. Admin removal sets both, so
  // either filter alone would do today - but they are independent columns, and a zone left with
  // active = true and a deleted_at stamp (a partial write, a manual SQL fix, a restore that only
  // touched one column) would otherwise keep accepting orders for pincodes an admin has removed.
  // Serviceability is the wrong place to be lenient.
  //
  // ⚡ PERFORMANCE: only the columns this function reads. Zones are fetched on every checkout, so
  // dropping the unused ones (created_by, created_at, deleted_at) shrinks the hot path's payload.
  const { data: zones, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("name, lat, lng, radius_km, supported_pincodes")
    .eq("active", true)
    .is("deleted_at", null);

  if (error) throw new Error(`Failed to fetch delivery zones: ${error.message}`);
  
  if (!zones || zones.length === 0) {
    return { isServiceable: false, zoneName: null, distanceKm: null };
  }

  // If pincode is provided, check against supported_pincodes array
  if (parsed.pincode) {
    const matchedZone = zones.find(z => z.supported_pincodes && z.supported_pincodes.includes(parsed.pincode));
    if (matchedZone) {
      return {
        isServiceable: true,
        zoneName: matchedZone.name,
        distanceKm: null // distance is not applicable for pincode checks
      };
    }
  }

  // If no pincode matched, but lat/lng is provided, check radius
  if (parsed.lat !== undefined && parsed.lng !== undefined) {
    let closestZone = null;
    let minDistance = Infinity;

    for (const zone of zones) {
      const dist = distanceKm({ lat: parsed.lat as number, lng: parsed.lng as number }, { lat: zone.lat, lng: zone.lng });
      if (dist <= zone.radius_km && dist < minDistance) {
        minDistance = dist;
        closestZone = zone;
      }
    }

    if (closestZone) {
      return { 
        isServiceable: true, 
        zoneName: closestZone.name, 
        distanceKm: Number(minDistance.toFixed(2)) 
      };
    }
  }

  // Not in any zone
  return { isServiceable: false, zoneName: null, distanceKm: null };
}
