/**
 * OmniQ mobile app - order status badge.
 * Author: OmniQ Team
 */
import React from "react";
import { Text } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
import type { OrderStatus } from "@/types/order.types";

type StatusBadgeProps = {
  status: OrderStatus | string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { colors } = useAppTheme();
  const normalized = status.toLowerCase();
  const displayLabel = normalized === "pending" ? "On the way" : status;
  
  return (
    <Text style={{ 
      color: colors.textSecondary, 
      ...typography.captionBold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 2
    }}>
      {displayLabel}
    </Text>
  );
}
