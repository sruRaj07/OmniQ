/**
 * OmniQ mobile app - buyer route group layout.
 * Smooth slide transitions for in-app buyer navigation.
 * Author: OmniQ Team
 */
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useCartStore } from "@/store/cartStore";
import { useAppTheme } from "@/store/useThemeStore";
import { useNavStore } from "@/store/useNavStore";
import { Platform } from "react-native";

export default function BuyerLayout() {
  const fetchCart = useCartStore((state) => state.fetchCart);
  const { colors } = useAppTheme();
  const slideDirection = useNavStore(state => state.slideDirection);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

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
