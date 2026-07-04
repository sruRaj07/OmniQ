/**
 * OmniQ mobile app - root Expo Router layout.
 * Custom silky-smooth screen transitions using native stack animations.
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/components/shared/AuthProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

/**
 * Smooth fade + slide transition config for all root-level navigation.
 * This handles splash → auth, auth → buyer/seller/admin transitions.
 */
const smoothTransition = {
  animation: "fade_from_bottom" as const,
  animationDuration: 350,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                ...smoothTransition,
                gestureEnabled: true,
                gestureDirection: "horizontal",
                contentStyle: { backgroundColor: "#0A0A0F" },
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
