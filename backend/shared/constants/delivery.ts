/**
 * OmniQ shared constants - delivery fee rules.
 * Author: OmniQ Team
 */

/** Carts at or above this subtotal (in INR) qualify for 100% free delivery. */
export const FREE_DELIVERY_THRESHOLD = 200;

/** Per-kilometer delivery rate (in INR) from the nearest inventory hub to delivery location. */
export const RATE_PER_KM = 10;

/** Flat delivery charge (in INR) applied when order subtotal is below the free-delivery threshold. */
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
 * 1. subtotal >= 200 -> Total delivery is 100% FREE (0 INR)
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
 * Authoritative single source of truth for total delivery fee.
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

/** INR still needed to unlock free base delivery; 0 once unlocked or empty cart. */
export function amountToFreeDelivery(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return FREE_DELIVERY_THRESHOLD;
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}
