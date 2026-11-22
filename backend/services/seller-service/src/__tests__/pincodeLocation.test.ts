import { describe, it, expect, vi, beforeEach } from "vitest";

// Pincode resolver function logic mirror to test resolution behaviors
async function testResolvePincode(pincode: string, customFetch: typeof fetch) {
  const cleanPin = pincode.trim().replace(/[^0-9]/g, "");
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) return null;

  // 1. Dedicated Zippopotam Indian Postal API
  try {
    const res = await customFetch(`https://api.zippopotam.us/in/${cleanPin}`, {
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
    // fallback
  }

  // 2. OpenStreetMap Nominatim fallback
  try {
    const res = await customFetch(
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
  } catch {
    // fallback
  }

  return null;
}

describe("Pincode Coordinates Resolution Suite", () => {
  it("rejects invalid pincodes before making network requests", async () => {
    const mockFetch = vi.fn();
    const invalidPins = ["", "   ", "12345", "1234567", "012345", "abcdef", "73321A"];

    for (const pin of invalidPins) {
      const result = await testResolvePincode(pin, mockFetch as any);
      expect(result).toBeNull();
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("successfully parses coordinates from Zippopotam API for valid Indian pincode (733215)", async () => {
    const mockZippoResponse = {
      "post code": "733215",
      country: "India",
      places: [
        {
          "place name": "Tungidighi",
          longitude: "88.0833",
          latitude: "25.8667",
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockZippoResponse),
    });

    const coords = await testResolvePincode("733215", mockFetch as any);

    expect(coords).not.toBeNull();
    expect(coords?.lat).toBe(25.8667);
    expect(coords?.lng).toBe(88.0833);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.zippopotam.us/in/733215",
      expect.anything()
    );
  });

  it("falls back to OpenStreetMap Nominatim if primary provider fails", async () => {
    const mockNominatimResponse = [
      {
        lat: "25.866700",
        lon: "88.083300",
        display_name: "Tungidighi, Raiganj, Uttar Dinajpur, West Bengal, 733215, India",
      },
    ];

    const mockFetch = vi
      .fn()
      // First call (Zippopotam) fails with network error
      .mockRejectedValueOnce(new Error("Network timeout"))
      // Second call (Nominatim) succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockNominatimResponse),
      });

    const coords = await testResolvePincode("733215", mockFetch as any);

    expect(coords).not.toBeNull();
    expect(coords?.lat).toBe(25.8667);
    expect(coords?.lng).toBe(88.0833);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
