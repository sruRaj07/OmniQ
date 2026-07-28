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
import { Platform, LogBox } from "react-native";

import { useAppTheme } from "@/store/useThemeStore";

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'pointerEvents is deprecated',
  'The action \'GO_BACK\' was not handled by any navigator.',
  '"textShadow*" style props are deprecated',
]);

export default function RootLayout() {
  const { colors, mode } = useAppTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                freezeOnBlur: true,
                gestureEnabled: Platform.OS !== 'web',
                gestureDirection: "horizontal",
                animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
                fullScreenGestureEnabled: Platform.OS === 'ios',
                contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary },
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
