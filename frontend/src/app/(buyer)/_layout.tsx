/**
 * OmniQ mobile app - buyer route group layout.
 * Smooth slide transitions for in-app buyer navigation.
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";

export default function BuyerLayout() {
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
