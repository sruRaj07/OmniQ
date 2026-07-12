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
        freezeOnBlur: true,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        contentStyle: { backgroundColor: "#0A0A0F" },
      }}
    />
  );
}
