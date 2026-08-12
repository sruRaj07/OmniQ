/**
 * OmniQ mobile app - cart hook.
 * Author: OmniQ Team
 */
import { useCartStore } from "@/store/cartStore";

export function useCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  
  return { 
    items, 
    addItem,
    updateQuantity, 
    removeItem, 
    clearCart,
    subtotal, 
    platformFee: 0, 
    total: subtotal 
  };
}
