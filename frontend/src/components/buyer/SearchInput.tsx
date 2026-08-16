/**
 * OmniQ mobile app - search entry bar (tappable, navigates to the search screen).
 * Author: OmniQ Team
 */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { SearchIcon } from "@/components/ui/SearchIcon";
import { useThemeColors } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";

/**
 * Rotating hints double as discovery: they tell a first-time buyer what this marketplace
 * actually stocks, which a static "Search OmniQ" never does.
 */
const DEFAULT_HINTS = ["atta", "rice", "cookware", "kurta", "extension board"];

/** Slow enough to finish reading, quick enough to see two or three before tapping. */
const HINT_INTERVAL_MS = 2600;

export interface SearchInputProps {
  /** Fixed placeholder. Supplying this turns hint rotation off. */
  placeholder?: string;
  /** Terms cycled through when no fixed `placeholder` is given. */
  hints?: string[];
  style?: ViewStyle;
}

export const SearchInput = React.memo(function SearchInput({
  placeholder,
  hints = DEFAULT_HINTS,
  style,
}: SearchInputProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [hintIndex, setHintIndex] = useState(0);
  const shouldRotate = !placeholder && hints.length > 1;

  // ⚡ PERFORMANCE: one setState every 2.6s, on a memoized leaf that renders two nodes. It cannot
  // reach the product list or any sibling, so the cost is a single text measure. The timer is torn
  // down on unmount and never starts when a fixed placeholder is supplied.
  useEffect(() => {
    if (!shouldRotate) return;
    const timer = setInterval(() => {
      setHintIndex(current => (current + 1) % hints.length);
    }, HINT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [shouldRotate, hints.length]);

  const label = placeholder ?? `Search "${hints[hintIndex % hints.length]}"`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search products"
      accessibilityHint="Opens the search screen"
      style={({ pressed }) => [styles.container, pressed && styles.pressed, style]}
      onPress={() => router.push("/(buyer)/search")}
    >
      <SearchIcon size={19} color={colors.textSecondary} />
      <View style={styles.labelWrap}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
  },
  // Opacity only - no layout or shadow recalculation, so the tap stays instant on low-end Android.
  pressed: {
    opacity: 0.75,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    ...typography.body,
    color: colors.textMuted,
  },
});
