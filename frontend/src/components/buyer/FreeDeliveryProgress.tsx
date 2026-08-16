/**
 * OmniQ mobile app - free delivery progress meter for the cart.
 * Author: OmniQ Team
 */
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useAppTheme } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/formatCurrency";

type FreeDeliveryProgressProps = {
  subtotal: number;
  remaining: number;
  threshold: number;
};

export function FreeDeliveryProgress({ subtotal, remaining, threshold }: FreeDeliveryProgressProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const unlocked = remaining === 0;

  // ⚡ PERFORMANCE: the fill is driven by one shared value on the UI thread rather than by
  // re-rendering the bar on every cart change. Width is a percentage so no layout measurement
  // is needed - important on the 2GB target device where a measure-then-animate pass stutters.
  const progress = useSharedValue(0);

  useEffect(() => {
    const ratio = threshold > 0 ? Math.min(1, Math.max(0, subtotal / threshold)) : 1;
    progress.value = withTiming(ratio, { duration: 350 });
  }, [subtotal, threshold, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`
  }));

  if (subtotal <= 0) return null;

  return (
    <View style={[styles.container, unlocked ? styles.containerUnlocked : null]}>
      <Text style={styles.message}>
        {unlocked ? (
          <>🎉 Yay! You get <Text style={styles.highlight}>FREE delivery</Text> on this order.</>
        ) : (
          <>Add <Text style={styles.highlight}>{formatCurrency(remaining)}</Text> more to get FREE delivery</>
        )}
      </Text>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: threshold, now: Math.min(subtotal, threshold) }}
        accessibilityLabel={
          unlocked
            ? "Free delivery unlocked"
            : `${formatCurrency(remaining)} more to unlock free delivery`
        }
      >
        <Animated.View
          style={[styles.fill, unlocked ? styles.fillUnlocked : null, fillStyle]}
        />
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    borderColor: "rgba(217, 119, 6, 0.22)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10
  },
  containerUnlocked: {
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    borderColor: "rgba(22, 163, 74, 0.22)"
  },
  message: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  highlight: {
    color: colors.textPrimary,
    fontWeight: "800"
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.bgTertiary,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.warning
  },
  fillUnlocked: {
    backgroundColor: colors.success
  }
});
