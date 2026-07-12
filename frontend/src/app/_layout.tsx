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

import { useAppTheme } from "@/store/useThemeStore";

export default function RootLayout() {
  const { colors, mode } = useAppTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} hidden />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                freezeOnBlur: true,
                gestureEnabled: true,
                gestureDirection: "horizontal",
                contentStyle: { backgroundColor: colors.bgPrimary },
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
