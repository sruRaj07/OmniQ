import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin before importing sellerService
vi.mock("../../../../shared/utils/supabaseClient", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import {
  distanceKm,
  findNearestWarehouse,
  attachWarehouseToSeller,
  attachWarehousesToSellers,
} from "../services/sellerService";
import {
  sellerUpdateProfileSchema,
  sellerStatusSchema,
} from "../validators/sellerValidator";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

describe("Seller Warehouse & Location Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Haversine Distance Calculation (distanceKm)", () => {
    it("returns 0 km for identical coordinates", () => {
      const point = { lat: 25.84, lng: 88.005 };
      const dist = distanceKm(point, point);
      expect(dist).toBeCloseTo(0, 4);
    });

    it("calculates accurate physical distance between nearby towns (Tungidighi & Karandighi)", () => {
      const tungidighi = { lat: 25.8667, lng: 88.0833 };
      const karandighi = { lat: 25.8167, lng: 88.0167 };
      const dist = distanceKm(tungidighi, karandighi);
      // Distance is ~8.7 km
      expect(dist).toBeGreaterThan(7);
      expect(dist).toBeLessThan(12);
    });

    it("calculates accurate long-distance physical distance (Bengaluru to Delhi)", () => {
      const bengaluru = { lat: 12.9716, lng: 77.5946 };
      const delhi = { lat: 28.6139, lng: 77.209 };
      const dist = distanceKm(bengaluru, delhi);
      // Distance is ~1740 km
      expect(dist).toBeGreaterThan(1700);
      expect(dist).toBeLessThan(1800);
    });
  });

  describe("2. Nearest Warehouse Auto-Link Logic (findNearestWarehouse)", () => {
    it("selects the closest calibrated warehouse by physical GPS distance", async () => {
      const mockZones = [
        {
          id: "zone-bengaluru",
          name: "Bengaluru Central Hub",
          lat: 12.9716,
          lng: 77.5946,
          radius_km: 15,
        },
        {
          id: "zone-tungidighi",
          name: "Tungidighi Central Warehouse",
          lat: 25.8667,
          lng: 88.0833,
          radius_km: 10,
        },
      ];

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockZones, error: null }),
      });

      // Store in Raiganj/Karandighi (close to Tungidighi)
      const storeCoords = { lat: 25.84, lng: 88.005 };
      const result = await findNearestWarehouse(storeCoords, "Raiganj");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("zone-tungidighi");
      expect(result?.name).toBe("Tungidighi Central Warehouse");
      expect(result?.distanceKm).toBeLessThan(15);
    });

    it("ignores uncalibrated warehouses (lat: 0, lng: 0) when computing GPS distance", async () => {
      const mockZones = [
        {
          id: "zone-uncalibrated",
          name: "Uncalibrated Hub",
          lat: 0,
          lng: 0,
          radius_km: 10,
        },
        {
          id: "zone-calibrated",
          name: "Calibrated Regional Hub",
          lat: 25.8667,
          lng: 88.0833,
          radius_km: 10,
        },
      ];

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockZones, error: null }),
      });

      const storeCoords = { lat: 25.85, lng: 88.05 };
      const result = await findNearestWarehouse(storeCoords, null);

      expect(result?.id).toBe("zone-calibrated");
    });

    it("matches warehouse by city name when seller coordinates are missing", async () => {
      const mockZones = [
        {
          id: "zone-kolkata",
          name: "Kolkata Central Fulfillment",
          lat: 22.5726,
          lng: 88.3639,
          radius_km: 20,
        },
        {
          id: "zone-delhi",
          name: "Delhi North Hub",
          lat: 28.6139,
          lng: 77.209,
          radius_km: 25,
        },
      ];

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockZones, error: null }),
      });

      const result = await findNearestWarehouse(null, "kolkata");

      expect(result?.id).toBe("zone-kolkata");
      expect(result?.name).toBe("Kolkata Central Fulfillment");
    });

    it("falls back to the first active warehouse if no coordinates or city match", async () => {
      const mockZones = [
        {
          id: "zone-default",
          name: "Primary Central Hub",
          lat: 25.8667,
          lng: 88.0833,
          radius_km: 10,
        },
      ];

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockZones, error: null }),
      });

      const result = await findNearestWarehouse(null, "Unknown City");

      expect(result?.id).toBe("zone-default");
    });
  });

  describe("3. Application-Level Join Safety (attachWarehouseToSeller)", () => {
    it("returns assigned_warehouse as null if seller has no assigned_warehouse_id", async () => {
      const seller = { id: "seller-1", business_name: "Fresh Grocers", assigned_warehouse_id: null };
      const enriched = await attachWarehouseToSeller(seller);

      expect(enriched.assigned_warehouse).toBeNull();
    });

    it("fetches warehouse by id directly without relying on PostgREST schema cache join", async () => {
      const mockWarehouse = {
        id: "wh-100",
        name: "Tungidighi Central Warehouse",
        lat: 25.8667,
        lng: 88.0833,
        radius_km: 10,
      };

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse, error: null }),
      });

      const seller = { id: "seller-1", business_name: "Fresh Grocers", assigned_warehouse_id: "wh-100" };
      const enriched = await attachWarehouseToSeller(seller);

      expect(enriched.assigned_warehouse).toEqual(mockWarehouse);
      expect(supabaseAdmin.from).toHaveBeenCalledWith("delivery_zones");
    });

    it("batch attaches warehouses to multiple sellers with a single query", async () => {
      const mockWarehouses = [
        { id: "wh-1", name: "Hub Alpha", lat: 25.0, lng: 88.0, radius_km: 10 },
        { id: "wh-2", name: "Hub Beta", lat: 26.0, lng: 89.0, radius_km: 15 },
      ];

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockWarehouses, error: null }),
      });

      const sellers = [
        { id: "s1", assigned_warehouse_id: "wh-1" },
        { id: "s2", assigned_warehouse_id: "wh-2" },
        { id: "s3", assigned_warehouse_id: null },
      ];

      const enriched = await attachWarehousesToSellers(sellers);

      expect(enriched).toHaveLength(3);
      expect(enriched[0].assigned_warehouse?.name).toBe("Hub Alpha");
      expect(enriched[1].assigned_warehouse?.name).toBe("Hub Beta");
      expect(enriched[2].assigned_warehouse).toBeNull();
    });
  });

  describe("4. Schema Validator Tests (sellerValidator)", () => {
    it("validates valid seller profile updates with city, lat, and lng", () => {
      const validPayload = {
        description: "We deliver organic fresh vegetables",
        city: "Raiganj",
        lat: 25.84,
        lng: 88.005,
        assignedWarehouseId: "e75121c0-b883-4217-bf99-8cfb8813c9eb",
      };

      const parsed = sellerUpdateProfileSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid latitude out of bounds (-90 to 90)", () => {
      const invalidPayload = {
        lat: 91.5,
        lng: 88.0,
      };

      const parsed = sellerUpdateProfileSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid longitude out of bounds (-180 to 180)", () => {
      const invalidPayload = {
        lat: 25.0,
        lng: -185.0,
      };

      const parsed = sellerUpdateProfileSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });

    it("rejects malformed assignedWarehouseId that is not a UUID", () => {
      const invalidPayload = {
        assignedWarehouseId: "not-a-valid-uuid",
      };

      const parsed = sellerUpdateProfileSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });

    it("validates seller status updates", () => {
      const validApproval = { status: "approved" };
      const validRejection = { status: "rejected", rejectionReason: "Invalid GST number" };
      const invalidStatus = { status: "unknown_status" };

      expect(sellerStatusSchema.safeParse(validApproval).success).toBe(true);
      expect(sellerStatusSchema.safeParse(validRejection).success).toBe(true);
      expect(sellerStatusSchema.safeParse(invalidStatus).success).toBe(false);
    });
  });
});
