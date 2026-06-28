/**
 * OmniQ mobile app - order data hook.
 * Author: OmniQ Team
 */
import { adminOrders, sellerOrders } from "@/lib/demoData";

export function useOrders() {
  return {
    buyerOrders: adminOrders,
    sellerOrders,
    isLoading: false
  };
}
