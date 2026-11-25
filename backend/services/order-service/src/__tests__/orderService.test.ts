import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin
vi.mock("../../../../shared/utils/supabaseClient", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { placeOrder, orderCreateSchema } from "../services/orderService";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

describe("Order Service & Delivery Edge Cases Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Input Schema Validation", () => {
    it("validates valid order create payload", () => {
      const valid = {
        items: [{ productId: "p-1", quantity: 2 }],
        deliveryAddress: { line1: "Tungidighi Main Road", pincode: "733215", phone: "9876543210" },
        buyerLat: 25.82,
        buyerLng: 87.92,
      };
      const parsed = orderCreateSchema.parse(valid);
      expect(parsed.items.length).toBe(1);
      expect(parsed.buyerLat).toBe(25.82);
    });

    it("rejects order payload with 0 items or negative quantity", () => {
      expect(() =>
        orderCreateSchema.parse({
          items: [],
          deliveryAddress: { pincode: "733215" },
        })
      ).toThrow();

      expect(() =>
        orderCreateSchema.parse({
          items: [{ productId: "p-1", quantity: -1 }],
          deliveryAddress: { pincode: "733215" },
        })
      ).toThrow();
    });
  });

  describe("2. Hyperlocal Delivery Radius Enforcement", () => {
    const mockSeller = {
      id: "seller-123",
      assigned_warehouse_id: "warehouse-tungidighi",
    };

    const mockWarehouse = {
      id: "warehouse-tungidighi",
      name: "Tungidighi Central Warehouse",
      lat: 25.8157,
      lng: 87.9208,
      radius_km: 10,
      supported_pincodes: ["733215"],
    };

    const mockProduct = {
      id: "prod-1",
      seller_id: "seller-123",
      price: 250,
      stock: 10,
      is_active: true,
    };

    it("rejects order when buyer coordinates are outside the warehouse service area", async () => {
      // Setup mock returns
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === "order_idempotency") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === "products") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [mockProduct], error: null }),
            }),
          };
        }
        if (table === "sellers") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockSeller, error: null }),
              }),
            }),
          };
        }
        if (table === "delivery_zones") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      // Buyer is in Siliguri (139 km away from Tungidighi warehouse), pincode not in supported
      const orderPayload = {
        items: [{ productId: "prod-1", quantity: 1 }],
        deliveryAddress: { line1: "Siliguri Junction", pincode: "734001", phone: "9876543210" },
        buyerLat: 26.7084,
        buyerLng: 88.4318,
      };

      await expect(
        placeOrder("buyer-456", orderPayload, "idem-key-out-of-zone")
      ).rejects.toThrow(/outside our delivery area/i);
    });
  });
});
