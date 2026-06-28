/**
 * OmniQ mobile app - serviceable location hook.
 * Author: OmniQ Team
 */
import { config } from "@/constants/config";

export function useLocation() {
  return {
    city: config.defaultZone.city,
    radiusKm: config.defaultZone.radiusKm,
    isServiceable: true
  };
}
