/**
 * OmniQ mobile app - seller toast.
 *
 * Replaces the blocking "Success!" dialog the product form used to raise. A seller listing
 * five products in a row should not have to dismiss five modals, so confirmation slides in
 * over the list and leaves on its own.
 *
 * Author: OmniQ Team
 */
import React, { memo, useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useThemeColors } from "@/store/useThemeStore";
import { RADIUS, SHADOW, SPACE, withAlpha } from "@/constants/sellerTheme";
import { AlertIcon, CheckCircleIcon } from "@/components/ui/SellerIcons";

export type ToastPayload = { message: string; tone?: "success" | "error" } | null;

type SellerToastProps = {
  toast: ToastPayload;
  onHide: () => void;
  /** Milliseconds the toast stays up before dismissing itself. */
  duration?: number;
};

export const SellerToast = memo(function SellerToast({ toast, onHide, duration = 2600 }: SellerToastProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const progress = useSharedValue(0);

  const message = toast?.message;
  const isError = toast?.tone === "error";

  useEffect(() => {
    if (!message) {
      progress.value = withTiming(0, { duration: 160 });
      return;
    }
    progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    const timer = setTimeout(onHide, duration);
    return () => clearTimeout(timer);
  }, [duration, message, onHide, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -24 }],
  }));

  if (!message) return null;

  const accent = isError ? colors.danger : colors.success;
  const Icon = isError ? AlertIcon : CheckCircleIcon;

  return (
    <Animated.View
      style={[styles.wrap, animatedStyle, { backgroundColor: colors.card, borderColor: withAlpha(accent, 0.35) }]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
        <Icon size={16} color={accent} strokeWidth={2.2} />
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
});

const getStyles = (colors: any) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      top: SPACE.sm,
      left: 0,
      right: 0,
      zIndex: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      paddingVertical: SPACE.md,
      paddingHorizontal: SPACE.lg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      ...SHADOW.md,
    },
    iconChip: { width: 30, height: 30, borderRadius: RADIUS.sm, alignItems: "center", justifyContent: "center" },
    message: { flex: 1, color: colors.textPrimary, fontSize: 13.5, fontWeight: "700", lineHeight: 19 },
  });
