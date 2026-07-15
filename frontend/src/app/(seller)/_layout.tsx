/**
 * OmniQ mobile app - seller route group layout.
 * Smooth slide transitions for seller dashboard navigation.
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";
import { useAppTheme } from "@/store/useThemeStore";
import { useNavStore } from "@/store/useNavStore";
import { Platform } from "react-native";

export default function SellerLayout() {
  const { colors } = useAppTheme();
  const slideDirection = useNavStore(state => state.slideDirection);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        animation: slideDirection,
        animationTypeForReplace: "push",
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary },
      }}
    />
  );
}
