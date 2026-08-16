/**
 * OmniQ mobile app - explicit "get the latest data" control.
 * Author: OmniQ Team
 */
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useThemeColors } from "@/store/useThemeStore";
import { useDataRefresh } from "@/hooks/useDataRefresh";

export interface RefreshButtonProps {
  size?: number;
  style?: ViewStyle;
}

export const RefreshButton = React.memo(function RefreshButton({
  size = 40,
  style,
}: RefreshButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { refresh, isRefreshing } = useDataRefresh();

  const glyph = Math.round(size * 0.45);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Refresh data"
      accessibilityHint="Fetches the latest information from the server"
      accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}
      disabled={isRefreshing}
      hitSlop={8}
      onPress={refresh}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
        style,
      ]}
    >
      {isRefreshing ? (
        // The platform spinner instead of a rotating icon: no animation driver of our own to
        // start, run and tear down on every refresh.
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textSecondary}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <Path d="M21 3v6h-6" />
        </Svg>
      )}
    </Pressable>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
