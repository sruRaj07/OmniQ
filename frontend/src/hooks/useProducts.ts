/**
 * OmniQ mobile app - product data hook.
 * Author: OmniQ Team
 */
import { products } from "@/lib/demoData";

export function useProducts() {
  return {
    products,
    isLoading: false
  };
}
