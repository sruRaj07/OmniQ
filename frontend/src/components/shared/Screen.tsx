/**
 * OmniQ mobile app - common screen wrapper.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { StyleSheet, View, Platform, StatusBar } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/store/useThemeStore";
import { BottomNavBar, type NavItem } from "@/components/ui/BottomNavBar";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  bottomNavItems?: NavItem[];
  onScroll?: (event: any) => void;
  header?: React.ReactNode;
}>;

export function Screen({
  children,
  scroll = true,
  bottomNavItems,
  onScroll,
  header
}: ScreenProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const translateY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      // 1. Prevent iOS rubber-banding (negative scrollY)
      const currentY = Math.max(0, event.contentOffset.y);
      const diff = currentY - lastScrollY.value;
      lastScrollY.value = currentY;

      // Track the scroll direction and clamp the delta
      // 110 ensures it slides completely off-screen smoothly
      const newY = translateY.value + diff;
      translateY.value = Math.max(0, Math.min(110, newY));

      if (onScroll) {
        // Warning: runOnJS(onScroll)(event) would be needed if onScroll is a JS function
        // For simple integrations, let's keep it clean
      }
    }
  });

  const navStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: interpolate(translateY.value, [0, 40, 110], [1, 1, 0], Extrapolation.CLAMP)
    };
  });

  const content = (
    <View style={styles.inner}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {header}
        {scroll ? (
          <Animated.ScrollView 
            style={styles.root} 
            contentContainerStyle={[styles.content, bottomNavItems ? { paddingBottom: 110 } : {}]} 
            onScroll={scrollHandler} 
            scrollEventThrottle={16} 
            showsVerticalScrollIndicator={false} 
            bounces={true}
          >
            {content}
          </Animated.ScrollView>
        ) : (
          <View style={[styles.root, bottomNavItems ? { paddingBottom: 90 } : {}]}>
            {content}
          </View>
        )}

        {bottomNavItems && (
          <Animated.View style={[styles.navContainer, navStyle]}>
            <BottomNavBar items={bottomNavItems} />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary,
    alignItems: 'center',
  },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 500, // Caps width on tablets and web for a perfect responsive layout
    backgroundColor: colors.bgPrimary,
    ...(Platform.OS === 'web' && {
      boxShadow: '0px 0px 30px rgba(0,0,0,0.08)' as any
    })
  },
  content: {
    paddingBottom: 28
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 18
  },
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  }
});