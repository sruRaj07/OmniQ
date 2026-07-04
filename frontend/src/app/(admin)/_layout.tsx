/**
 * OmniQ mobile app - admin route group layout.
 * Smooth slide transitions for admin panel navigation.
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";

export default function AdminLayout() {
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
