/**
 * OmniQ mobile app - delivery fee rules.
 * Author: OmniQ Team
 */

/** Carts at or above this subtotal (in ₹) qualify for 100% free delivery. */
export const FREE_DELIVERY_THRESHOLD = 200;

/** Per-kilometer delivery rate (in ₹) from the nearest inventory hub to delivery location. */
export const RATE_PER_KM = 10;

/** Flat delivery charge (in ₹) applied when order subtotal is below the free-delivery threshold. */
export const FLAT_DELIVERY_CHARGE = 25;

export type DeliveryFeeDetails = {
  subtotal: number;
  distanceKm: number;
  ratePerKm: number;
  deliveryFee: number;
  standardDeliveryFee: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
  savings: number;
};

/**
 * Calculates delivery fee:
 * 1. subtotal >= 200 -> Total delivery is 100% FREE (₹0)
 * 2. subtotal < 200  -> Total delivery = max(₹25 flat, distanceKm × ₹10) (rounded to nearest rupee)
 * Base delivery charge is always 0 in all cases.
 */
export function calculateDeliveryFeeDetails(subtotal: number, distanceKm: number = 0): DeliveryFeeDetails {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? Number(subtotal) : 0;
  const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? Number(distanceKm) : 0;

  const distanceBasedFee = Math.round(safeDistance * RATE_PER_KM);
  const standardDeliveryFee = Math.max(FLAT_DELIVERY_CHARGE, distanceBasedFee);
  const isFreeDelivery = safeSubtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = safeSubtotal > 0 && !isFreeDelivery ? standardDeliveryFee : 0;
  const amountToFree = safeSubtotal > 0 ? Math.max(0, FREE_DELIVERY_THRESHOLD - safeSubtotal) : FREE_DELIVERY_THRESHOLD;
  const savings = isFreeDelivery && safeSubtotal > 0 ? standardDeliveryFee : 0;

  return {
    subtotal: safeSubtotal,
    distanceKm: safeDistance,
    ratePerKm: RATE_PER_KM,
    deliveryFee,
    standardDeliveryFee,
    isFreeDelivery,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    amountToFreeDelivery: amountToFree,
    savings
  };
}

/**
 * Mirrors `backend/shared/constants/delivery.ts`. The order service is authoritative - it
 * recomputes the fee from database prices at checkout - but the cart must predict the same
 * number so the buyer is never surprised at confirmation. Change both files together.
 */
export function computeDeliveryFee(subtotal: number, distanceKm: number = 0): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return calculateDeliveryFeeDetails(subtotal, distanceKm).deliveryFee;
}


/**
 * The delivery charge on an order row. `orders` rows written after the fee shipped
 * carry it inside `total` (total > subtotal).
 */
export function resolveOrderDeliveryFee(subtotal: unknown, storedTotal: unknown): number {
  const items = Number(subtotal) || 0;
  const stored = Number(storedTotal) || 0;
  if (items <= 0) return 0;
  if (stored > items) return Math.round((stored - items) * 100) / 100;
  return computeDeliveryFee(items);
}

/** What the buyer pays: items plus delivery, consistent across buyer, seller and admin views. */
export function resolveOrderTotal(subtotal: unknown, storedTotal: unknown): number {
  const items = Number(subtotal) || 0;
  if (items <= 0) return Number(storedTotal) || 0;
  return items + resolveOrderDeliveryFee(items, storedTotal);
}

/**
 * Pulls the item subtotal off an order however the API shaped it - the column when present,
 * otherwise the sum of its line items.
 */
export function orderSubtotalOf(order: any): number {
  const stored = Number(order?.subtotal) || 0;
  if (stored > 0) return stored;
  const items = order?.order_items ?? order?.items ?? [];
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (sum: number, item: any) =>
      sum + (Number(item?.subtotal) || Number(item?.unit_price) * Number(item?.quantity) || 0),
    0
  );
}

/** Convenience for list/detail screens: the buyer-facing total of an order object. */
export function orderTotalOf(order: any): number {
  return resolveOrderTotal(orderSubtotalOf(order), order?.total ?? order?.total_amount ?? order?.amount);
}

/** ₹ still needed to unlock free base delivery; 0 once it is unlocked or the cart is empty. */
export function amountToFreeDelivery(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return FREE_DELIVERY_THRESHOLD;
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}

