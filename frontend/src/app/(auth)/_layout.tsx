/**
 * OmniQ mobile app - auth group layout.
 * Elegant fade transition for auth screens (login/signup flow).
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 300,
        gestureEnabled: false,
        contentStyle: { backgroundColor: "#0A0A0F" },
      }}
    />
  );
}
