/**
 * OmniQ location service - delivery zone logic.
 * Author: OmniQ Team
 */
import { zoneCheckSchema } from "../validators/locationValidator";
import { supabase } from "../../../../shared/utils/supabaseClient";

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

export async function checkZone(input: unknown) {
  const parsed = zoneCheckSchema.parse(input);
  
  // Fetch all active delivery zones from Supabase
  const { data: zones, error } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("active", true);

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
