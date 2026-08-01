/**
 * AnimatedEmptyCart - A playful, eye-catching empty cart animation.
 * The cart floats, spins, bounces, wiggles, and emits sparkles
 * to keep the empty state delightful rather than boring.
 * Author: OmniQ Team
 */
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, withDelay, Easing, interpolate } from "react-native-reanimated";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { SparklesIcon } from "@/components/ui/SparklesIcon";
import { useThemeColors } from "@/store/useThemeStore";

const SPARKLE_COUNT = 8;

export function AnimatedEmptyCart() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  
  // ── Core Animations ──
  const floatAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const burstAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const spinAnim = useSharedValue(0);
  const wobbleAnim = useSharedValue(0);
  const tiltAnim = useSharedValue(0);

  // Sparkle particles
  const sparkleAnims = useRef(Array.from({ length: SPARKLE_COUNT }, () => ({
    x: useSharedValue(0),
    y: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0)
  }))).current;

  // ── 1. Gentle floating / levitation (always running) ──
  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  // ── 2. Gentle tilt while floating ──
  useEffect(() => {
    tiltAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // ── 3. Glow pulse ring (always running) ──
  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  // ── 4. Excitement burst cycle (periodic) ──
  useEffect(() => {
    let mounted = true;
    const runBurst = () => {
      if (!mounted) return;

      // Fire sparkle particles outward
      sparkleAnims.forEach((s, i) => {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
        const distance = 35 + Math.random() * 20;
        s.x.value = withTiming(Math.cos(angle) * distance, { duration: 500 });
        s.y.value = withTiming(Math.sin(angle) * distance, { duration: 500 });
        s.opacity.value = withSequence(
          withTiming(1, { duration: 120 }),
          withTiming(0, { duration: 380 })
        );
        s.scale.value = withSequence(
          withTiming(1.5, { duration: 200 }),
          withTiming(0, { duration: 300 })
        );
      });

      // Jump up
      burstAnim.value = withSequence(
        withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 400, easing: Easing.bounce })
      );

      // Quick scale pop
      scaleAnim.value = withSequence(
        withTiming(1.35, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(0.8, { duration: 120 }),
        withSpring(1, { damping: 15, stiffness: 180 })
      );

      // 360° spin
      spinAnim.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

      // Post-landing wobble
      wobbleAnim.value = withSequence(
        withDelay(500, withTiming(1, { duration: 80 })),
        withTiming(-1, { duration: 80 }),
        withTiming(0.6, { duration: 60 }),
        withTiming(-0.6, { duration: 60 }),
        withTiming(0.3, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );

      setTimeout(() => {
        if (!mounted) return;
        spinAnim.value = 0;
        sparkleAnims.forEach(s => {
          s.x.value = 0;
          s.y.value = 0;
          s.opacity.value = 0;
          s.scale.value = 0;
        });
        setTimeout(() => {
          if (mounted) runBurst();
        }, 3500);
      }, 1200);
    };

    const timeout = setTimeout(runBurst, 1500);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // ── Animated Styles ──
  const glowStyle1 = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(glowAnim.value, [0, 1], [0.9, 1.6]) }],
      opacity: interpolate(glowAnim.value, [0, 0.5, 1], [0.08, 0.25, 0.08])
    };
  });

  const glowStyle2 = useAnimatedStyle(() => {
    const scale = interpolate(glowAnim.value, [0, 1], [0.9, 1.6]) - 0.2;
    const opacity = interpolate(glowAnim.value, [0, 0.5, 1], [0.08, 0.25, 0.08]) + 0.05;
    return {
      transform: [{ scale }],
      opacity
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const yFloat = interpolate(floatAnim.value, [0, 1], [0, -10]);
    const yBurst = interpolate(burstAnim.value, [0, 1], [0, -25]);
    const spinDeg = interpolate(spinAnim.value, [0, 1], [0, 360]);
    const wobbleDeg = interpolate(wobbleAnim.value, [-1, 1], [-20, 20]);
    const tiltDeg = interpolate(tiltAnim.value, [-1, 1], [-8, 8]);
    
    return {
      transform: [
        { translateY: yFloat + yBurst },
        { scale: scaleAnim.value },
        { rotate: `${spinDeg}deg` },
        { rotate: `${wobbleDeg}deg` },
        { rotate: `${tiltDeg}deg` }
      ]
    };
  });

  return (
    <View style={styles.container}>
      {/* Outer glow ring 1 */}
      <Animated.View style={[styles.glowRing, glowStyle1]} />

      {/* Outer glow ring 2 (delayed offset) */}
      <Animated.View style={[styles.glowRingInner, glowStyle2]} />

      {/* Sparkle particles */}
      {sparkleAnims.map((s, i) => {
        const sparkleStyle = useAnimatedStyle(() => ({
          transform: [
            { translateX: s.x.value },
            { translateY: s.y.value },
            { scale: s.scale.value }
          ],
          opacity: s.opacity.value
        }));
        return (
          <Animated.View key={`sparkle-${i}`} style={[styles.sparkle, sparkleStyle]}>
            <SparklesIcon size={12} color={i % 2 === 0 ? colors.goldLight : colors.accentLight} />
          </Animated.View>
        );
      })}

      {/* Main cart icon */}
      <Animated.View style={[styles.iconCircle, iconStyle]}>
        <ShoppingCartIcon size={48} color={colors.accentLight} />
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 16
  },
  glowRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: colors.accentLight,
    backgroundColor: "transparent"
  },
  glowRingInner: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: colors.goldLight,
    backgroundColor: "transparent"
  },
  sparkle: {
    position: "absolute"
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center"
  }
});