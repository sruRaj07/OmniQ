/**
 * OmniQ mobile app - cart hook.
 * Author: OmniQ Team
 */
import { useCartStore } from "@/store/cartStore";

export function useCart() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return { items, updateQuantity, removeItem, subtotal, platformFee: 29, total: subtotal + 29 };
}
