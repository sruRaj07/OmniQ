/**
 * OmniQ mobile app – shared GPS location utility.
 * Works seamlessly on native Android/iOS and Web.
 *
 * On native: requests foreground GPS permissions and reads device GPS with fallback.
 * On web: tries browser geolocation (5s), and if unavailable/denied/timed-out,
 * seamlessly falls back to network IP Geolocation so web users are never blocked.
 *
 * Also provides resolvePincodeToCoords() for resolving Indian pincodes directly to coordinates.
 */
import * as Location from "expo-location";
import { Platform } from "react-native";

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Checks whether coordinates appear to be the default Google Android Emulator mock location
 * (1600 Amphitheatre Pkwy, Mountain View, CA: ~37.422, ~-122.084) or outside India.
 */
export function isEmulatorOrForeignCoords(coords: LatLng): boolean {
  if (!coords) return false;
  // Android Studio default mock location: 37.422001, -122.084061
  const isGoogleplex =
    Math.abs(coords.lat - 37.422) < 0.1 && Math.abs(coords.lng - (-122.084)) < 0.1;

  // Indian territory bounding box roughly: Lat 6° to 38° N, Lng 68° to 98° E
  const isOutsideIndia =
    coords.lat < 6 || coords.lat > 38 || coords.lng < 68 || coords.lng > 98;

  return isGoogleplex || isOutsideIndia;
}

/** How long to wait for browser geolocation before trying IP fallback */
const WEB_GPS_TIMEOUT_MS = 4000;
/** How long to wait for native GPS */
const NATIVE_GPS_TIMEOUT_MS = 10000;

// ─── IP Geolocation Fallback (for Web browsers without GPS hardware) ───
async function fetchIpGeolocation(): Promise<LatLng | null> {
  // Provider 1: ipwho.is (Free, fast, supports CORS for browser fetch, accurate to city/ISP)
  // Provider 1: geojs.io (Free, open-source, instant, CORS-enabled, not blocked by ad blockers)
  try {
    const res = await fetch("https://get.geojs.io/v1/ip/geo.json", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data?.latitude);
      const lng = parseFloat(data?.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return {
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        };
      }
    }
  } catch (err) {
    console.warn("geojs lookup failed:", err);
  }

  // Provider 2: ipwho.is (Fast, supports CORS, accurate city/region)
  try {
    const res = await fetch("https://ipwho.is/", {
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.latitude && data.longitude) {
        return {
          lat: Number(Number(data.latitude).toFixed(6)),
          lng: Number(Number(data.longitude).toFixed(6)),
        };
      }
    }
  } catch (err) {
    console.warn("ipwho.is lookup failed:", err);
  }

  // Provider 2: ipapi.co fallback
  // Provider 3: freeipapi.com
  try {
    const res = await fetch("https://freeipapi.com/api/json", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data?.latitude);
      const lng = parseFloat(data?.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return {
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        };
      }
    }
  } catch {
    // ignore
  }

  // Provider 4: ipapi.co fallback
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.error && data.latitude && data.longitude) {
        return {
          lat: Number(Number(data.latitude).toFixed(6)),
          lng: Number(Number(data.longitude).toFixed(6)),
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

// ─── Web Geolocation Implementation ────────────────────────────────────
async function webGetCurrentPosition(): Promise<LatLng> {
  // 1. Try real browser HTML5 Geolocation with high accuracy (uses CoreLocation/Wi-Fi positioning on laptops/desktops)
  try {
    const browserPos = await new Promise<LatLng>((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        return reject(new Error("Browser does not support geolocation"));
      }

      const timer = setTimeout(() => {
        reject(new Error("Browser location request timed out. Please allow location access or search your address."));
      }, 12000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          // Check that coordinates are not obviously foreign or zero
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          resolve({ lat, lng });
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
        {
          enableHighAccuracy: true, // Triggers Wi-Fi positioning & CoreLocation instead of ISP cell tower
          timeout: 12000,
          maximumAge: 0, // Fresh reading, not stale cached
        }
      );
    });

    if (browserPos?.lat && browserPos?.lng) {
      return browserPos;
    }
  } catch (browserErr: any) {
    console.warn("Browser GPS unavailable or timed out:", browserErr);
    if (browserErr?.code === 1 || String(browserErr?.message || "").toLowerCase().includes("denied")) {
      throw new Error(
        "Location permission is blocked in your browser. Please allow location access or search your town/address in the search box."
      );
    }
  }

  // 2. Do NOT silently fall back to ISP IP Geolocation!
  // In quick commerce (Zepto/Blinkit), an ISP IP address points 50-150 km away to the telecom POP (e.g. Siliguri or Kolkata).
  // Asking the user to search their address is the standard quick commerce behavior.
  throw new Error(
    "Could not pinpoint your exact GPS position on this browser. Please type your area, town, or landmark in the search box above."
  );
}

// ─── Native Geolocation Implementation ─────────────────────────────────
async function nativeGetCurrentPosition(): Promise<LatLng> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error(
      "Location permission denied. Please allow OmniQ to access your location in Settings."
    );
  }

  // Try High accuracy (GPS satellite), then Balanced (Cell / Wi-Fi)
  for (const accuracy of [Location.Accuracy.High, Location.Accuracy.Balanced]) {
    try {
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("__timeout__")), NATIVE_GPS_TIMEOUT_MS)
        ),
      ]);
      if (position?.coords) {
        return {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
      }
    } catch (err: any) {
      if (err?.message === "__timeout__") continue;
      if (
        err?.code === 1 ||
        err?.code === "E_LOCATION_PERMISSION_DENIED" ||
        String(err?.message ?? "").toLowerCase().includes("permission")
      ) {
        throw new Error(
          "Location permission denied. Please allow OmniQ to access your location in Settings."
        );
      }
      if (
        err?.code === "ERR_LOCATION_SETTINGS_UNSATISFIED" ||
        err?.code === "E_LOCATION_SETTINGS_UNSATISFIED"
      ) {
        throw new Error(
          "Location services are turned off. Please enable GPS / Location in your device settings."
        );
      }
    }
  }

  // Fallback to last known position
  try {
    const last = await Location.getLastKnownPositionAsync({});
    if (last?.coords) {
      return {
        lat: Number(last.coords.latitude.toFixed(6)),
        lng: Number(last.coords.longitude.toFixed(6)),
      };
    }
  } catch {
    // ignore
  }

  // Last-ditch network IP fallback on native if GPS hardware cannot get lock indoors
  const ipFallback = await fetchIpGeolocation();
  if (ipFallback) {
    return ipFallback;
  }

  throw new Error(
    "GPS signal unavailable. Please ensure GPS is turned on and try again, or enter coordinates manually."
  );
}

// ─── Public API ─────────────────────────────────────────────────────────
/**
 * Returns current coordinates.
 * On web: uses browser GPS with seamless IP Geolocation fallback so it always works.
 * On native: uses expo-location with multi-tier fallback.
 */
export async function fetchCurrentLocation(): Promise<LatLng> {
  return Platform.OS === "web"
    ? webGetCurrentPosition()
    : nativeGetCurrentPosition();
}

/**
 * Resolves geographic coordinates for any 6-digit Indian pincode using OpenStreetMap Nominatim.
 * Resolves geographic coordinates for any 6-digit Indian pincode.
 * Tries Zippopotam first (dedicated fast zip code directory) then OpenStreetMap Nominatim.
 * Returns null if the pincode cannot be geocoded.
 */
export async function resolvePincodeToCoords(pincode: string): Promise<LatLng | null> {
  const cleanPin = pincode.trim().replace(/[^0-9]/g, "");
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) return null;

  // 1. Dedicated Zippopotam Indian Postal API
  try {
    const res = await fetch(`https://api.zippopotam.us/in/${cleanPin}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const place = data?.places?.[0];
      if (place?.latitude && place?.longitude) {
        const lat = parseFloat(place.latitude);
        const lng = parseFloat(place.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
          };
        }
      }
    }
  } catch (err) {
    console.warn("Zippopotam pincode lookup failed:", err);
  }

  // 2. OpenStreetMap Nominatim fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=json`,
      {
        headers: { "User-Agent": "OmniQ-Ecommerce/1.0" },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as any[];
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        return {
          lat: Number(Number(data[0].lat).toFixed(6)),
          lng: Number(Number(data[0].lon).toFixed(6)),
        };
      }
    }
  } catch (err) {
    console.warn("Pincode geocode lookup failed:", err);
    console.warn("Nominatim pincode lookup failed:", err);
  }

  return null;
}
