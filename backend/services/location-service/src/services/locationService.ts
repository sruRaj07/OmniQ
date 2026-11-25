/**
 * OmniQ location service - delivery zone logic.
 * Author: OmniQ Team
 */
import { pincodeSchema, zoneCheckSchema, calculateDeliverySchema } from "../validators/locationValidator";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";
import { calculateDeliveryFeeDetails, type DeliveryFeeDetails } from "../../../../shared/constants/delivery";

export type PincodeLocation = {
  pincode: string;
  city: string;
  district: string;
  state: string;
  lat?: number;
  lng?: number;
};

// ⚡ PERFORMANCE: Indian pincode -> city/state mapping never changes, so a resolved lookup is
// cached for the lifetime of the process. This keeps checkout off the network for repeat
// pincodes (the common case: one buyer, one delivery area) and shields us from India Post
// rate limits. Misses are not cached so a transient upstream failure can be retried.
const pincodeCache = new Map<string, PincodeLocation>();
const pincodeCoordsCache = new Map<string, { lat: number; lng: number }>();
const PINCODE_LOOKUP_TIMEOUT_MS = 4000;

// Preload known warehouse/store pincode coordinates for instant <1ms resolution
pincodeCoordsCache.set("733215", { lat: 25.8157, lng: 87.9208 }); // Karandighi
pincodeCoordsCache.set("560001", { lat: 12.9797, lng: 77.5946 }); // Bengaluru Central

// In-memory zone cache with 30s TTL to achieve ultra-fast checkout evaluations
let zonesCache: { zones: any[]; fetchedAt: number } | null = null;
const ZONES_CACHE_TTL_MS = 30_000;

async function getActiveDeliveryZones(): Promise<any[]> {
  const now = Date.now();
  if (zonesCache && now - zonesCache.fetchedAt < ZONES_CACHE_TTL_MS) {
    return zonesCache.zones;
  }

  const { data: zones, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("id, name, lat, lng, radius_km, supported_pincodes")
    .eq("active", true)
    .is("deleted_at", null);

  if (error) throw new Error(`Failed to fetch delivery zones: ${error.message}`);
  const result = zones || [];
  zonesCache = { zones: result, fetchedAt: now };
  return result;
}

// Distance Matrix in-memory cache to stay inside Google Maps free $200 tier
const distanceMatrixCache = new Map<string, { km: number; durationMins: number; cachedAt: number }>();
const DISTANCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
 * Calculates accurate driving distance using Google Distance Matrix API.
 * Uses 24-hour in-memory caching and intelligent distance pruning to stay within
 * Google Maps Platform's free tier.
 */
export async function roadDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<number> {
  if (!from.lat || !from.lng || !to.lat || !to.lng) {
    return 0;
  }

  const straightLine = distanceKm(from, to);

  // If points are within 150m, return immediately without consuming API quota
  if (straightLine < 0.15) {
    return Number(Math.max(0.1, straightLine).toFixed(1));
  }

  // Check in-memory cache
  const cacheKey = `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
  const cached = distanceMatrixCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < DISTANCE_CACHE_TTL_MS) {
    return cached.km;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return Number((straightLine * 1.25).toFixed(1));
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.lat},${from.lng}&destinations=${to.lat},${to.lng}&mode=driving&region=in&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = (await res.json()) as any;
      const element = data?.rows?.[0]?.elements?.[0];
      if (element?.status === "OK" && element?.distance?.value !== undefined) {
        const roadKm = Number((element.distance.value / 1000).toFixed(1));
        const durationMins = Math.round((element.duration?.value || 0) / 60);
        distanceMatrixCache.set(cacheKey, {
          km: roadKm,
          durationMins,
          cachedAt: Date.now(),
        });
        return roadKm;
      }
    }
  } catch (err) {
    console.warn("[locationService] Google Distance Matrix request failed:", err);
  }

  // Graceful fallback: straight line with 1.25x road tortuosity
  return Number((straightLine * 1.25).toFixed(1));
}

/**
 * Resolves geographic coordinates for an Indian pincode.
 * Cached in memory to ensure sub-millisecond lookups on repeat requests.
 */
export async function resolvePincodeCoordinates(pincode: string): Promise<{ lat: number; lng: number } | null> {
  const cached = pincodeCoordsCache.get(pincode);
  if (cached) return cached;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`, {
      headers: { "User-Agent": "OmniQ-Ecommerce/1.0" },
      signal: AbortSignal.timeout(2500)
    });
    if (response.ok) {
      const data = (await response.json()) as any[];
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const coords = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
        pincodeCoordsCache.set(pincode, coords);
        return coords;
      }
    }
  } catch {
    // Graceful fallback if geocoding service is unavailable
  }

  return null;
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

  // Concurrently resolve coordinates if possible
  const coords = await resolvePincodeCoordinates(pincode);

  const resolved: PincodeLocation = {
    pincode,
    // District is the administrative city for delivery purposes; Block/Name is the locality.
    city: String(postOffice.District ?? postOffice.Block ?? postOffice.Name ?? "").trim(),
    district: String(postOffice.District ?? "").trim(),
    state: String(postOffice.State ?? "").trim(),
    lat: coords?.lat,
    lng: coords?.lng
  };
  if (!resolved.city || !resolved.state) return null;

  pincodeCache.set(pincode, resolved);
  return resolved;
}

export async function checkZone(input: unknown) {
  const parsed = zoneCheckSchema.parse(input);
  const zones = await getActiveDeliveryZones();

  if (!zones || zones.length === 0) {
    return { isServiceable: false, zoneName: null, distanceKm: null };
  }

  // If pincode is provided, check against supported_pincodes array
  if (parsed.pincode) {
    const matchedZones = zones.filter(z => z.supported_pincodes && z.supported_pincodes.includes(parsed.pincode));
    if (matchedZones.length > 0) {
      let closestZone = matchedZones[0];
      let dist: number | null = null;
      let userCoords = parsed.lat !== undefined && parsed.lng !== undefined
        ? { lat: parsed.lat, lng: parsed.lng }
        : await resolvePincodeCoordinates(parsed.pincode);

      if (userCoords) {
        let bestDist = Infinity;
        for (const mz of matchedZones) {
          const mzLat = Number(mz.lat);
          const mzLng = Number(mz.lng);
          if (!isNaN(mzLat) && !isNaN(mzLng) && (mzLat !== 0 || mzLng !== 0)) {
            const d = distanceKm(userCoords, { lat: mzLat, lng: mzLng });
            if (d < bestDist) {
              bestDist = d;
              closestZone = mz;
            }
          }
        }
        if (bestDist < Infinity) {
          dist = Number(bestDist.toFixed(2));
        }
      }

      return {
        isServiceable: true,
        zoneName: closestZone.name,
        distanceKm: dist
      };
    }
  }


  // If lat/lng is provided, check radius against closest zone
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

export type DeliveryCalculationResult = DeliveryFeeDetails & {
  isServiceable: boolean;
  nearestHub: string | null;
  hubLat?: number;
  hubLng?: number;
  userLat?: number;
  userLng?: number;
  error?: string;
};

/**
 * Calculates delivery fee, distance to nearest inventory hub, and full Option C breakdown.
 * Sub-millisecond execution when zones and pincodes are cached in memory.
 */
export async function calculateDelivery(input: unknown): Promise<DeliveryCalculationResult> {
  const parsed = calculateDeliverySchema.parse(input);
  const zones = await getActiveDeliveryZones();

  if (!zones || zones.length === 0) {
    const defaultDetails = calculateDeliveryFeeDetails(parsed.subtotal, 0);
    return {
      isServiceable: false,
      nearestHub: null,
      error: "No active delivery zones available.",
      ...defaultDetails
    };
  }

  // Whether the coordinates came from precise GPS (not pincode geocoding).
  // Precise GPS → use road-distance for accurate delivery fee.
  const hasPreciseGps = parsed.lat !== undefined && parsed.lng !== undefined;

  let userCoords: { lat: number; lng: number } | null = null;
  if (hasPreciseGps) {
    userCoords = { lat: parsed.lat!, lng: parsed.lng! };
  } else if (parsed.pincode) {
    userCoords = await resolvePincodeCoordinates(parsed.pincode);
  }

  // Find warehouse: If sellerId or warehouseId is provided, calculate from that specific warehouse!
  let closestZone: any = null;
  let minDistance = Infinity;

  let targetWarehouseId = parsed.warehouseId;
  if (!targetWarehouseId && parsed.sellerId) {
    try {
      const { data: seller } = await supabaseAdmin
        .from("sellers")
        .select("assigned_warehouse_id")
        .eq("id", parsed.sellerId)
        .maybeSingle();
      if (seller?.assigned_warehouse_id) {
        targetWarehouseId = seller.assigned_warehouse_id;
      }
    } catch {
      // Fallback to normal zone selection
    }
  }

  if (targetWarehouseId) {
    const specificZone = zones.find((z) => z.id === targetWarehouseId);
    if (specificZone) {
      closestZone = specificZone;
      if (userCoords) {
        const hubCoords = { lat: Number(specificZone.lat), lng: Number(specificZone.lng) };
        const rawDist = hasPreciseGps
          ? await roadDistanceKm(userCoords, hubCoords)
          : distanceKm(userCoords, hubCoords);

        // Sanity safeguard: If coordinates yield an unrealistic distance (> 200 km)
        // but buyer pincode is in the zone's supported pincodes, the GPS is an emulator or roaming device.
        // Fall back to standard within-zone delivery distance so buyers are not overcharged.
        const isSupportedPin = parsed.pincode && specificZone.supported_pincodes?.includes(parsed.pincode);
        if (rawDist > 200 && isSupportedPin) {
          minDistance = Math.min(specificZone.radius_km || 10, 3.5);
        } else {
          minDistance = rawDist;
        }
      } else {
        minDistance = 2.5; // Default within-zone estimate
      }
    }
  }

  // If no specific warehouse match, calculate against nearest zone based on coordinates or pincode support
  if (!closestZone) {
    // 1. If coordinates are available, find the closest active warehouse by real physical distance
    if (userCoords) {
      for (const zone of zones) {
        const zLat = Number(zone.lat);
        const zLng = Number(zone.lng);
        if (!isNaN(zLat) && !isNaN(zLng) && (zLat !== 0 || zLng !== 0)) {
          // For nearest-zone selection, always use cheap Haversine — road distance only for the final calculation
          const dist = distanceKm(userCoords, { lat: zLat, lng: zLng });
          if (dist < minDistance) {
            minDistance = dist;
            closestZone = zone;
          }
        }
      }
      // Now recalculate with road distance for the closest zone (if precise GPS)
      if (closestZone && hasPreciseGps) {
        minDistance = await roadDistanceKm(userCoords, { lat: Number(closestZone.lat), lng: Number(closestZone.lng) });
      }
    }

    // 2. Pincode match fallback if coordinates didn't resolve or didn't match
    if (parsed.pincode && (!closestZone || minDistance === Infinity)) {
      const matched = zones.find(z => z.supported_pincodes && z.supported_pincodes.includes(parsed.pincode));
      if (matched) {
        closestZone = matched;
        if (userCoords && matched.lat && matched.lng && Number(matched.lat) !== 0) {
          minDistance = hasPreciseGps
            ? await roadDistanceKm(userCoords, { lat: Number(matched.lat), lng: Number(matched.lng) })
            : distanceKm(userCoords, { lat: Number(matched.lat), lng: Number(matched.lng) });
        } else {
          minDistance = 2.5;
        }
      }
    }
  }



  if (!closestZone) {
    const defaultDetails = calculateDeliveryFeeDetails(parsed.subtotal, 0);
    return {
      isServiceable: false,
      nearestHub: null,
      error: "Location is outside of our delivery zones.",
      ...defaultDetails
    };
  }

  const finalDistance = Number(Math.max(0.1, minDistance).toFixed(1));
  const serviceRadius = Number(closestZone.radius_km) || 15;
  const isSupportedPin = parsed.pincode && closestZone.supported_pincodes?.includes(parsed.pincode);

  // Hyperlocal Zepto-style Serviceability Gate:
  // If buyer's location is beyond the darkstore / warehouse delivery radius,
  // do NOT mark it serviceable and do NOT charge absurd delivery fees.
  if (!isSupportedPin && finalDistance > serviceRadius) {
    const defaultDetails = calculateDeliveryFeeDetails(parsed.subtotal, 0);
    return {
      ...defaultDetails,
      isServiceable: false,
      nearestHub: closestZone.name,
      hubLat: closestZone.lat,
      hubLng: closestZone.lng,
      userLat: userCoords?.lat,
      userLng: userCoords?.lng,
      distanceKm: finalDistance,
      error: `Outside delivery area. ${closestZone.name} serves within ${serviceRadius} km, but your address is ${finalDistance} km away.`
    };
  }

  const details = calculateDeliveryFeeDetails(parsed.subtotal, finalDistance);

  return {
    isServiceable: true,
    nearestHub: closestZone.name,
    hubLat: closestZone.lat,
    hubLng: closestZone.lng,
    userLat: userCoords?.lat,
    userLng: userCoords?.lng,
    ...details
  };
}

function parseGoogleAddressComponents(components: any[] = []) {
  let pincode = "";
  let city = "";
  let state = "";
  let area = "";
  let street = "";

  for (const c of components) {
    const types: string[] = c.types || [];
    if (types.includes("postal_code")) pincode = c.long_name || c.short_name;
    else if (types.includes("locality")) city = c.long_name;
    else if (!city && (types.includes("administrative_area_level_2") || types.includes("sublocality_level_1"))) {
      city = c.long_name;
    } else if (types.includes("administrative_area_level_1")) state = c.long_name;
    else if (types.includes("sublocality") || types.includes("neighborhood")) area = c.long_name;
    else if (types.includes("route")) street = c.long_name;
  }

  return { pincode, city, state, area, street };
}

export async function autocompletePlaces(input: string, sessionToken?: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&key=${apiKey}${sessionToken ? `&sessiontoken=${sessionToken}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn("[locationService] Places autocomplete status:", data.status, data.error_message);
      return [];
    }
    return (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || "",
    }));
  } catch (err) {
    console.warn("[locationService] Places autocomplete failed:", err);
    return [];
  }
}

export async function getPlaceDetails(placeId: string, sessionToken?: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components&key=${apiKey}${sessionToken ? `&sessiontoken=${sessionToken}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (data.status !== "OK" || !data.result) {
      console.warn("[locationService] Place details status:", data.status, data.error_message);
      return null;
    }
    const result = data.result;
    const loc = result.geometry?.location;
    const { pincode, city, state, area, street } = parseGoogleAddressComponents(result.address_components);

    return {
      lat: Number(loc?.lat),
      lng: Number(loc?.lng),
      formattedAddress: result.formatted_address || "",
      city,
      state,
      pincode,
      area,
      street,
    };
  } catch (err) {
    console.warn("[locationService] Place details failed:", err);
    return null;
  }
}

export async function reverseGeocodeCoords(lat: number, lng: number) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (data.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0) {
      return null;
    }
    const best = data.results[0];
    const { pincode, city, state, area, street } = parseGoogleAddressComponents(best.address_components);

    return {
      lat,
      lng,
      formattedAddress: best.formatted_address || "",
      city,
      state,
      pincode,
      area,
      street,
    };
  } catch (err) {
    console.warn("[locationService] Reverse geocode failed:", err);
    return null;
  }
}
