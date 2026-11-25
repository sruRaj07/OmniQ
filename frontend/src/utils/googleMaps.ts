/**
 * OmniQ - Google Maps Places and Geocoding client utilities.
 * Connects via backend API gateway to ensure full cross-platform compatibility
 * (Web, iOS, Android) without browser CORS restrictions, and enforces session token
 * pooling to stay well within Google's free $200/month tier.
 */
import { apiClient } from "@/lib/apiClient";

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
}

export interface GeocodedAddress {
  lat: number;
  lng: number;
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
  area: string;
  street: string;
}

/**
 * Generates an opaque session token for grouping autocomplete keystrokes
 * with a subsequent place details selection into a single billing event.
 */
export function generatePlacesSessionToken(): string {
  return "omniq-sess-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Searches places matching the given query with debounced autocomplete.
 * First queries Google Places API; if 0 results or network failure, falls back
 * to OpenStreetMap Nominatim / postal directory for small Indian towns and pincodes.
 */
export async function searchPlacesAutocomplete(
  input: string,
  sessionToken?: string
): Promise<PlaceSuggestion[]> {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // 1. Google Places Autocomplete via API Gateway
  try {
    const res = await apiClient.get("/location/places/autocomplete", {
      params: {
        input: trimmed,
        sessionToken,
      },
    });
    const places = (res.data?.data || []) as PlaceSuggestion[];
    if (places.length > 0) return places;
  } catch (err) {
    console.warn("[googleMaps] Google Places autocomplete error:", err);
  }

  // 2. Fallback: OpenStreetMap Nominatim for local Indian towns, wards & pincodes
  try {
    const query = /^[1-9][0-9]{5}$/.test(trimmed)
      ? `postalcode=${trimmed}&country=India`
      : `q=${encodeURIComponent(trimmed + ", India")}&countrycodes=in`;

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${query}&format=json&limit=5`, {
      headers: { "User-Agent": "OmniQ-Ecommerce/1.0" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = (await res.json()) as any[];
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          placeId: `osm-${d.place_id}`,
          description: d.display_name,
          mainText: d.name || d.display_name.split(",")[0],
          secondaryText: d.display_name.split(",").slice(1, 4).join(",").trim(),
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        }));
      }
    }
  } catch (err) {
    console.warn("[googleMaps] Nominatim fallback failed:", err);
  }

  return [];
}

/**
 * Fetches coordinates and structured address components for a chosen place_id.
 */
export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string,
  preloadedCoords?: { lat?: number; lng?: number }
): Promise<GeocodedAddress | null> {
  if (!placeId) return null;

  // Handle OSM-based place suggestion directly
  if (placeId.startsWith("osm-") && preloadedCoords?.lat && preloadedCoords?.lng) {
    const reverse = await reverseGeocodeCoords(preloadedCoords.lat, preloadedCoords.lng);
    if (reverse) return reverse;
    return {
      lat: preloadedCoords.lat,
      lng: preloadedCoords.lng,
      formattedAddress: "Selected Address",
      city: "",
      state: "",
      pincode: "",
      area: "",
      street: "",
    };
  }

  try {
    const res = await apiClient.get("/location/places/details", {
      params: {
        placeId,
        sessionToken,
      },
    });
    return (res.data?.data || null) as GeocodedAddress | null;
  } catch (err) {
    console.warn("[googleMaps] fetchPlaceDetails error:", err);
    return null;
  }
}

/**
 * Reverse-geocodes GPS coordinates into formatted human-readable address.
 */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<GeocodedAddress | null> {
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

  try {
    const res = await apiClient.get("/location/geocode", {
      params: { lat, lng },
    });
    return (res.data?.data || null) as GeocodedAddress | null;
  } catch (err) {
    console.warn("[googleMaps] reverseGeocodeCoords error:", err);
    return null;
  }
}
