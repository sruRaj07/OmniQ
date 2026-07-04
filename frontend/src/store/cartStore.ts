/**
 * OmniQ mobile app - cart state store.
 * Author: OmniQ Team
 */
import { create } from "zustand";
import type { Product } from "@/types/product.types";

export type CartLine = {
  product: Product;
  quantity: number;
  color?: string;
  size?: string;
};

type CartStore = {
  items: CartLine[];
  addItem: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (product: Product) =>
    set((state) => {
      const existing = state.items.find((item) => item.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        };
      }
      return {
        items: [...state.items, { product, quantity: 1 }]
      };
    }),
  updateQuantity: (productId: string, quantity: number) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    })),
  removeItem: (productId: string) =>
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId)
    })),
  clearCart: () => set({ items: [] })
}));
