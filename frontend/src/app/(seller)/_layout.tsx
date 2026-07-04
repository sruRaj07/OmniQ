/**
 * OmniQ mobile app - seller route group layout.
 * Smooth slide transitions for seller dashboard navigation.
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";

export default function SellerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 280,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        contentStyle: { backgroundColor: "#0A0A0F" },
      }}
    />
  );
}
