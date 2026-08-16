/**
 * OmniQ mobile app - ready-made pull-to-refresh control for screens that own their scroll surface.
 *
 * `Screen` wires this up for its own ScrollView. Screens passing `scroll={false}` hold the
 * scrolling list themselves (a FlashList), so they attach this to that list instead.
 *
 * Author: OmniQ Team
 */
import React from "react";
import { RefreshControl } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";
import { useDataRefresh } from "@/hooks/useDataRefresh";

export function useRefreshControl() {
  const colors = useThemeColors();
  const { refresh, isRefreshing } = useDataRefresh();

  return (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={refresh}
      tintColor={colors.accent}
      colors={[colors.accent]}
    />
  );
}
