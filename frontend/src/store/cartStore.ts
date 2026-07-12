/**
 * OmniQ mobile app - cart state store.
 * Author: OmniQ Team
 */
import { create } from "zustand";
import type { Product } from "@/types/product.types";
import { apiClient } from "@/lib/apiClient";

export type CartLine = {
  product: Product;
  quantity: number;
  color?: string;
  size?: string;
};

type CartStore = {
  items: CartLine[];
  fetchCart: () => Promise<void>;
  addItem: (product: Product) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  fetchCart: async () => {
    try {
      const res = await apiClient.get("/cart");
      // The backend returns { id, product_id, quantity, product: { ... } }
      const cartItems = (res.data?.data || res.data || []).map((row: any) => ({
        product: row.product,
        quantity: row.quantity
      }));
      set({ items: cartItems });
    } catch (e) {
      console.error("Failed to fetch cart", e);
    }
  },
  addItem: async (product: Product) => {
    try {
      await apiClient.post("/cart/items", { productId: product.id, quantity: 1 });
      const items = get().items;
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        set({
          items: items.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        });
      } else {
        set({ items: [...items, { product, quantity: 1 }] });
      }
    } catch (e) {
      console.error("Failed to add to cart", e);
    }
  },
  updateQuantity: async (productId: string, quantity: number) => {
    try {
      await apiClient.patch(`/cart/items/${productId}`, { quantity: Math.max(1, quantity) });
      set((state) => ({
        items: state.items.map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      }));
    } catch (e) {
      console.error("Failed to update cart quantity", e);
    }
  },
  removeItem: async (productId: string) => {
    try {
      await apiClient.delete(`/cart/items/${productId}`);
      set((state) => ({
        items: state.items.filter((item) => item.product.id !== productId)
      }));
    } catch (e) {
      console.error("Failed to remove item", e);
    }
  },
  clearCart: async () => {
    try {
      await apiClient.delete("/cart");
      set({ items: [] });
    } catch (e) {
      console.error("Failed to clear cart", e);
    }
  }
}));
