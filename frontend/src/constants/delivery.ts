/**
 * OmniQ mobile app - delivery fee rules.
 * Author: OmniQ Team
 */

/** Carts at or above this subtotal (in ₹) ship free. */
export const FREE_DELIVERY_THRESHOLD = 100;

/** Flat delivery charge (in ₹) applied to carts below the threshold. */
export const DELIVERY_FEE = 20;

/**
 * Mirrors `backend/shared/constants/delivery.ts`. The order service is authoritative - it
 * recomputes the fee from database prices at checkout - but the cart must predict the same
 * number so the buyer is never surprised at confirmation. Change both files together.
 */
export function computeDeliveryFee(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

/**
 * The delivery charge on an order row. `orders` has no delivery_fee column, so there are two
 * cases: rows written after the fee shipped already carry it inside `total` (total > subtotal),
 * and older rows were stored at total === subtotal. Applying the rule to the older ones keeps
 * every screen agreeing that a ₹50 order costs ₹70.
 */
export function resolveOrderDeliveryFee(subtotal: unknown, storedTotal: unknown): number {
  const items = Number(subtotal) || 0;
  const stored = Number(storedTotal) || 0;
  if (items <= 0) return 0;
  if (stored > items) return stored - items;
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

/** ₹ still needed to unlock free delivery; 0 once it is unlocked or the cart is empty. */
export function amountToFreeDelivery(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}
