/**
 * OmniQ shared constants - delivery fee rules.
 * Author: OmniQ Team
 */

/** Carts at or above this subtotal (in INR) ship free. */
export const FREE_DELIVERY_THRESHOLD = 100;

/** Flat delivery charge (in INR) applied to carts below the threshold. */
export const DELIVERY_FEE = 20;

/**
 * The single source of truth for delivery pricing. The client shows the fee before checkout and
 * the order service recomputes it at checkout - both must agree, so both call this rule rather
 * than inlining the numbers. The frontend mirrors it in `frontend/src/constants/delivery.ts`
 * (it cannot import across the workspace boundary); change the two together.
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
