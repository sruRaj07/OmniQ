/**
 * OmniQ mobile app - buyer route group layout.
 * Smooth slide transitions for in-app buyer navigation.
 * Author: OmniQ Team
 */
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useCartStore } from "@/store/cartStore";

export default function BuyerLayout() {
  const fetchCart = useCartStore((state) => state.fetchCart);

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
        contentStyle: { backgroundColor: "#0A0A0F" },
      }}
    />
  );
}
