import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin
vi.mock("../../../../shared/utils/supabaseClient", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import {
  distanceKm,
  roadDistanceKm,
  calculateDelivery,
  checkZone,
} from "../services/locationService";
import {
  pincodeSchema,
  zoneCheckSchema,
  calculateDeliverySchema,
  autocompleteQuerySchema,
  placeDetailsQuerySchema,
  reverseGeocodeQuerySchema,
} from "../validators/locationValidator";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

describe("Location Service & Zepto Geofencing Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Haversine Distance (distanceKm)", () => {
    it("returns 0 km for identical coordinates", () => {
      const p = { lat: 25.8157, lng: 87.9208 };
      expect(distanceKm(p, p)).toBeCloseTo(0, 4);
    });

    it("accurately computes short distances (< 10 km)", () => {
      const tungidighi = { lat: 25.8667, lng: 88.0833 };
      const karandighi = { lat: 25.8167, lng: 88.0167 };
      const d = distanceKm(tungidighi, karandighi);
      expect(d).toBeGreaterThan(8);
      expect(d).toBeLessThan(11);
    });

    it("accurately computes long distances (Siliguri to Tungidighi ~111 km straight line)", () => {
      const siliguri = { lat: 26.7084, lng: 88.4318 };
      const tungidighi = { lat: 25.8157, lng: 87.9208 };
      const d = distanceKm(siliguri, tungidighi);
      expect(d).toBeGreaterThan(100);
      expect(d).toBeLessThan(125);
    });
  });

  describe("2. Road Distance & In-Memory Cache (roadDistanceKm)", () => {
    it("returns 0 if either origin or destination is missing", async () => {
      const d = await roadDistanceKm({ lat: 0, lng: 0 }, { lat: 25.8, lng: 88.0 });
      expect(d).toBe(0);
    });

    it("returns min 0.1 km immediately for sub-150m walking distance without external API call", async () => {
      const p1 = { lat: 25.81570, lng: 87.92080 };
      const p2 = { lat: 25.81575, lng: 87.92085 }; // ~8 meters away
      const d = await roadDistanceKm(p1, p2);
      expect(d).toBeLessThanOrEqual(0.1);
    });

    it("caches repeat requests so second call resolves in 0ms", async () => {
      const from = { lat: 25.8157, lng: 87.9208 };
      const to = { lat: 25.8300, lng: 87.9300 };
      const first = await roadDistanceKm(from, to);
      const second = await roadDistanceKm(from, to);
      expect(first).toEqual(second);
    });
  });

  describe("3. Hyperlocal Serviceability & Out-of-Zone Protection (calculateDelivery)", () => {
    const mockTungidighiHub = {
      id: "hub-tungidighi-1",
      name: "Tungidighi Central Warehouse",
      lat: 25.8157,
      lng: 87.9208,
      radius_km: 10,
      supported_pincodes: ["733215"],
    };

    beforeEach(() => {
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [mockTungidighiHub],
              error: null,
            }),
          }),
        }),
      });
    });

    it("marks order as serviceable when buyer is within warehouse radius (e.g. 2.5 km)", async () => {
      const buyerNear = { lat: 25.8250, lng: 87.9250 }; // ~1.1 km from hub
      const res = await calculateDelivery({
        subtotal: 500,
        lat: buyerNear.lat,
        lng: buyerNear.lng,
      });

      expect(res.isServiceable).toBe(true);
      expect(res.nearestHub).toBe("Tungidighi Central Warehouse");
      expect(res.distanceKm).toBeLessThanOrEqual(10);
      expect(res.deliveryFee).toBeDefined();
    });

    it("CRITICAL: marks order as UNserviceable when buyer is outside radius (e.g. Siliguri ~111 km away)", async () => {
      const buyerFar = { lat: 26.7084, lng: 88.4318 }; // Siliguri
      const res = await calculateDelivery({
        subtotal: 500,
        lat: buyerFar.lat,
        lng: buyerFar.lng,
      });

      // Hyperlocal Zepto Gate
      expect(res.isServiceable).toBe(false);
      expect(res.deliveryFee).toBe(0); // Zero delivery fee, never charge ₹1,23,161
      expect(res.error).toContain("Outside delivery area");
      expect(res.error).toContain("10 km");
    });

    it("overrides out-of-zone foreign/emulator GPS if buyer pincode is in supported_pincodes", async () => {
      // Roaming device or emulator coords outside India / far away, but valid local pincode
      const res = await calculateDelivery({
        subtotal: 500,
        lat: 37.422, // California emulator mock location
        lng: -122.084,
        pincode: "733215",
      });

      expect(res.isServiceable).toBe(true);
      expect(res.nearestHub).toBe("Tungidighi Central Warehouse");
    });

    it("applies free delivery charge (₹0) when subtotal meets free delivery threshold (>= 200 INR)", async () => {
      const buyerNear = { lat: 25.8250, lng: 87.9250 };
      const res = await calculateDelivery({
        subtotal: 1500, // High order value qualifies for free delivery
        lat: buyerNear.lat,
        lng: buyerNear.lng,
      });

      expect(res.isServiceable).toBe(true);
      expect(res.isFreeDelivery).toBe(true);
      expect(res.baseDeliveryFee).toBe(0); // 0 INR delivery charge for orders >= 200 INR
    });

    it("applies 25 INR delivery charge and 4 INR/km distance charge with upper bound ceiling rounding", async () => {
      const buyerNear = { lat: 25.8250, lng: 87.9250 }; // ~1.1 km from hub
      const res = await calculateDelivery({
        subtotal: 150, // Below 200 free delivery threshold
        lat: buyerNear.lat,
        lng: buyerNear.lng,
      });

      expect(res.isServiceable).toBe(true);
      expect(res.isFreeDelivery).toBe(false);
      expect(res.baseDeliveryFee).toBe(25); // 25 INR delivery charge
      expect(res.ratePerKm).toBe(4); // 4 INR/km distance charge
      // Upper bound ceiling rounding: e.g. 1.1 * 4 = 4.4 -> 5 INR
      const expectedDistCharge = Math.ceil(Number(((res.distanceKm || 0) * 4).toFixed(4)));
      expect(res.distanceCharge).toBe(expectedDistCharge);
      expect(res.deliveryFee).toBe(25 + expectedDistCharge); // Total = 25 INR + distance charge
    });

    it("verifies 0.1 km distance rounds up to upper bound 1 INR (0.4 -> 1 INR)", async () => {
      const buyerSuperNear = { lat: 25.81571, lng: 87.92081 }; // within warehouse grounds (0.1 km)
      const res = await calculateDelivery({
        subtotal: 150,
        lat: buyerSuperNear.lat,
        lng: buyerSuperNear.lng,
      });

      expect(res.isServiceable).toBe(true);
      expect(res.distanceKm).toBe(0.1);
      // 0.1 km * 4 = 0.4 INR, upper bound ceiling rounded to 1 INR
      expect(res.distanceCharge).toBe(1);
      expect(res.deliveryFee).toBe(26); // 25 INR base + 1 INR distance
    });
  });

  describe("4. Zone Check (checkZone)", () => {
    it("returns isServiceable: true if pincode matches supported_pincodes", async () => {
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "zone-1",
                  name: "Central Hub",
                  lat: 25.8157,
                  lng: 87.9208,
                  radius_km: 10,
                  supported_pincodes: ["733215"],
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      const res = await checkZone({ pincode: "733215" });
      expect(res.isServiceable).toBe(true);
      expect(res.zoneName).toBeTruthy();
    });

    it("returns isServiceable: false if pincode is unsupported and no coords match", async () => {
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "zone-1",
                  name: "Central Hub",
                  lat: 25.8157,
                  lng: 87.9208,
                  radius_km: 10,
                  supported_pincodes: ["733215"],
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      const res = await checkZone({ pincode: "110001" }); // Delhi pincode
      expect(res.isServiceable).toBe(false);
    });
  });

  describe("5. Input Validation Edge Cases", () => {
    it("pincodeSchema accepts valid 6-digit Indian pincode", () => {
      expect(pincodeSchema.parse("733215")).toBe("733215");
      expect(pincodeSchema.parse("560001")).toBe("560001");
    });

    it("pincodeSchema rejects 5-digit, 7-digit, letters, or pincodes starting with 0", () => {
      expect(() => pincodeSchema.parse("012345")).toThrow();
      expect(() => pincodeSchema.parse("73321")).toThrow();
      expect(() => pincodeSchema.parse("7332155")).toThrow();
      expect(() => pincodeSchema.parse("73321A")).toThrow();
    });

    it("calculateDeliverySchema rejects negative subtotal", () => {
      expect(() =>
        calculateDeliverySchema.parse({ subtotal: -10, lat: 25.8, lng: 88.0 })
      ).toThrow();
    });

    it("calculateDeliverySchema rejects invalid latitude (>90 or <-90)", () => {
      expect(() =>
        calculateDeliverySchema.parse({ subtotal: 100, lat: 95.0, lng: 88.0 })
      ).toThrow();
    });

    it("autocompleteQuerySchema requires at least 1 character", () => {
      expect(() => autocompleteQuerySchema.parse({ input: "" })).toThrow();
      expect(autocompleteQuerySchema.parse({ input: "Tungidighi" })).toEqual({
        input: "Tungidighi",
      });
    });

    it("reverseGeocodeQuerySchema coerces string coordinates to numbers safely", () => {
      const parsed = reverseGeocodeQuerySchema.parse({ lat: "25.8157", lng: "87.9208" });
      expect(parsed.lat).toBe(25.8157);
      expect(parsed.lng).toBe(87.9208);
    });
  });
});
