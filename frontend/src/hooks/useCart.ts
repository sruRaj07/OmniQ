/**
 * OmniQ mobile app - cart hook.
 * Author: OmniQ Team
 */
import { useCartStore } from "@/store/cartStore";
import {
  FREE_DELIVERY_THRESHOLD,
  amountToFreeDelivery,
  computeDeliveryFee,
  calculateDeliveryFeeDetails,
  type DeliveryFeeDetails
} from "@/constants/delivery";
import { calculateTieredPrice, type TieredPriceResult } from "@/utils/tieredPricing";
import type { CartLine } from "@/store/cartStore";

export function getCartItemPricing(item: CartLine): TieredPriceResult {
  return calculateTieredPrice({
    quantity: item.quantity,
    price: item.product.price,
    offerPrice: item.product.offer_price,
    offerLimitQty: item.product.offer_limit_qty,
    unit: item.product.unit
  });
}

export function useCart(distanceKm: number = 0) {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  
  let subtotal = 0;
  let standardSubtotal = 0;

  for (const item of items) {
    const pricing = getCartItemPricing(item);
    subtotal += pricing.totalPrice;
    standardSubtotal += pricing.standardTotalPrice;
  }

  const totalSavings = Math.max(0, Math.round((standardSubtotal - subtotal) * 100) / 100);
  const deliveryDetails = calculateDeliveryFeeDetails(subtotal, distanceKm);
  const remainingForFreeDelivery = deliveryDetails.amountToFreeDelivery;

  return {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    standardSubtotal,
    totalSavings,
    platformFee: 0,
    deliveryFee: deliveryDetails.deliveryFee,
    standardDeliveryFee: deliveryDetails.standardDeliveryFee,
    distanceKm: deliveryDetails.distanceKm,
    ratePerKm: deliveryDetails.ratePerKm,
    deliverySavings: deliveryDetails.savings,
    deliveryDetails,
    remainingForFreeDelivery,
    hasFreeDelivery: subtotal > 0 && deliveryDetails.isFreeDelivery,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    total: subtotal + deliveryDetails.deliveryFee,
    getItemPricing: getCartItemPricing
  };
}


