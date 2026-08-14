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
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Platform, LogBox } from "react-native";

import { useThemeColors } from "@/store/useThemeStore";
import { useMemo } from "react";

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'pointerEvents is deprecated',
  'The action \'GO_BACK\' was not handled by any navigator.',
  '"textShadow*" style props are deprecated',
  'Animated: `useNativeDriver` is not supported because the native animated module is missing',
  'Animated: `useNativeDriver`',
]);


export default function RootLayout() {
  const colors = useThemeColors();

  const screenOptions = useMemo(() => ({
    headerShown: false,
    freezeOnBlur: true,
    gestureEnabled: Platform.OS !== 'web',
    gestureDirection: "horizontal" as const,
    animation: Platform.OS === 'web' ? 'none' as const : 'slide_from_right' as const,
    fullScreenGestureEnabled: Platform.OS === 'ios',
    contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary },
  }), [colors]);

  return (
    // SafeAreaProvider is required by OfflineBanner's useSafeAreaInsets. v5 seeds
    // insets from a native constant, so children still render on the first frame.
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Stack screenOptions={screenOptions} />
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
        {/* Last sibling + zIndex 999 so it floats over every route. Kept outside
            ErrorBoundary so connectivity is still reported on a crash screen. */}
        <OfflineBanner />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
