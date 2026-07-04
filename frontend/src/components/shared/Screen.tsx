/**
 * OmniQ mobile app - common screen wrapper.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { useRef } from "react";
import { StyleSheet, View, Animated } from "react-native";
import { colors } from "@/constants/colors";
import { BottomNavBar, type NavItem } from "@/components/ui/BottomNavBar";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  bottomNavItems?: NavItem[];
}>;

export function Screen({ children, scroll = true, bottomNavItems }: ScreenProps) {
  const scrollY = useRef(new Animated.Value(0)).current;

  // 1. Prevent iOS rubber-banding (negative scrollY) from glitching the diffClamp
  const clampedScrollY = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: 'clamp',
  });

  // Track the scroll direction and clamp the delta
  // 110 ensures it slides completely off-screen smoothly
  const diffClamp = Animated.diffClamp(clampedScrollY, 0, 110);

  // Slide down out of view when scrolling down
  const translateY = diffClamp.interpolate({
    inputRange: [0, 110],
    outputRange: [0, 110],
    extrapolate: 'clamp',
  });

  // Dissolve (fade out) gracefully, delaying the fade slightly for a premium feel
  const opacity = diffClamp.interpolate({
    inputRange: [0, 40, 110],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const content = (
    <View style={styles.inner}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      {scroll ? (
        <Animated.ScrollView 
          style={styles.root} 
          contentContainerStyle={[styles.content, bottomNavItems ? { paddingBottom: 110 } : {}]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {content}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.root, bottomNavItems ? { paddingBottom: 90 } : {}]}>{content}</View>
      )}

      {bottomNavItems && (
        <Animated.View 
          style={[
            styles.navContainer, 
            { 
              transform: [{ translateY }],
              opacity 
            }
          ]}
        >
          <BottomNavBar items={bottomNavItems} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary
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
