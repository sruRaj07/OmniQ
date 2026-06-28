/**
 * OmniQ mobile app - order status badge.
 * Author: OmniQ Team
 */
import { Badge } from "@/components/ui/Badge";
import type { OrderStatus } from "@/types/order.types";

type StatusBadgeProps = {
  status: OrderStatus | string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("ship") || normalized.includes("active") ? "success" : normalized.includes("pend") ? "gold" : "accent";
  return <Badge label={status} tone={tone} />;
}
