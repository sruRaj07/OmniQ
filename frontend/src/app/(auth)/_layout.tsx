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
        animation: Platform.OS === 'web' ? 'none' : "slide_from_right",
        freezeOnBlur: true,
        gestureEnabled: Platform.OS !== 'web',
        gestureDirection: "horizontal",
        fullScreenGestureEnabled: Platform.OS === 'ios',
        contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary },
      }}
    />
  );
}
