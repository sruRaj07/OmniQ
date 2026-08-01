/**
 * OmniQ mobile app - auth group layout.
 * Elegant fade transition for auth screens (login/signup flow).
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";
import { useThemeColors } from "@/store/useThemeStore";
import React from "react";
import { Platform } from "react-native";

export default function AuthLayout() {
  const colors = useThemeColors();

  const screenOptions = React.useMemo(() => ({
    headerShown: false,
    animation: Platform.OS === 'web' ? 'none' as const : "slide_from_right" as const,
    freezeOnBlur: true,
    gestureEnabled: Platform.OS !== 'web',
    gestureDirection: "horizontal" as const,
    fullScreenGestureEnabled: Platform.OS === 'ios',
    contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary },
  }), [colors]);
  return (
    <Stack screenOptions={screenOptions} />
  );
}
