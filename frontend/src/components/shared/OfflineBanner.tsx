/**
 * OmniQ mobile app - offline status banner.
 *
 * Mounted once at the root. Slides in when connectivity drops and auto-hides
 * when it returns. All animation runs on the UI thread via Reanimated worklets,
 * so it stays smooth even while the JS thread is busy re-fetching.
 *
 * Author: OmniQ Team
 */
import React, { useEffect } from "react";
import { StyleSheet, Text, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";

/** OmniQ warning amber. */
const WARNING = "#F59E0B";
const BANNER_HEIGHT = 36;
const DURATION = 220;

export function OfflineBanner() {
  const quality = useNetworkQuality();
  const insets = useSafeAreaInsets();
  const isOffline = quality === "offline";

  // 0 = fully hidden, 1 = fully shown. Driven entirely on the UI thread.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isOffline ? 1 : 0, { duration: DURATION });
  }, [isOffline, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [-(BANNER_HEIGHT + insets.top), 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity: progress.value,
      // Once hidden, stop intercepting touches meant for the screen beneath.
      pointerEvents: progress.value === 0 ? "none" : "auto",
    };
  }, [insets.top]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top, height: BANNER_HEIGHT + insets.top },
        animatedStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      // Hidden from the a11y tree when online so it is not announced.
      accessibilityElementsHidden={!isOffline}
      importantForAccessibility={isOffline ? "yes" : "no-hide-descendants"}
    >
      <Text style={styles.text} numberOfLines={1}>
        You&apos;re offline — showing cached products
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: WARNING,
    alignItems: "center",
    justifyContent: "center",
    // Above screen content, below modals.
    zIndex: 999,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
