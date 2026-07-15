/**
 * OmniQ mobile app - auth group layout.
 * Elegant fade transition for auth screens (login/signup flow).
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";
import { useAppTheme } from "@/store/useThemeStore";
import { Platform } from "react-native";

export default function AuthLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        freezeOnBlur: true,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        customAnimationOnGesture: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary },
      }}
    />
  );
}
