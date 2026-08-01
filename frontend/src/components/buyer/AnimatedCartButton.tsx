/**
 * AnimatedCartButton - A show-stopping, multi-layered animated cart icon.
 * Features: floating levitation, pulsing glow ring, sparkle particles,
 * periodic excitement burst (jump + spin + wobble), and morphing icon swap.
 * Author: OmniQ Team
 */
import { useEffect, useRef, useState, memo, useMemo } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, withDelay, Easing, interpolate } from "react-native-reanimated";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { SparklesIcon } from "@/components/ui/SparklesIcon";
import { useThemeColors } from "@/store/useThemeStore";

const SPARKLE_COUNT = 6;

function AnimatedSparkle({ s, colors, styles }: any) {
  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: s.x.value },
      { translateY: s.y.value },
      { scale: s.scale.value }
    ],
    opacity: s.opacity.value
  }));
  return (
    <Animated.View style={[styles.sparkle, sparkleStyle]}>
      <SparklesIcon size={8} color={colors.goldLight} />
    </Animated.View>
  );
}

export const AnimatedCartButton = memo(function AnimatedCartButton({ onPress }: { onPress?: () => void; }) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  // ── Core Animations ──
  const floatAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const burstAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const spinAnim = useSharedValue(0);
  const wobbleAnim = useSharedValue(0);
  const [showSparkles, setShowSparkles] = useState(false);

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
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  // ── 2. Glow pulse ring (always running) ──
  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  // ── 3. Excitement burst cycle (periodic) ──
  useEffect(() => {
    let mounted = true;
    const runBurst = () => {
      if (!mounted) return;
      setShowSparkles(true);

      // Fire sparkle particles outward
      sparkleAnims.forEach((s, i) => {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
        const distance = 18 + Math.random() * 10;
        s.x.value = withTiming(Math.cos(angle) * distance, { duration: 400 });
        s.y.value = withTiming(Math.sin(angle) * distance, { duration: 400 });
        s.opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 300 })
        );
        s.scale.value = withSequence(
          withTiming(1.2, { duration: 150 }),
          withTiming(0, { duration: 250 })
        );
      });

      // Jump up
      burstAnim.value = withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.bounce })
      );

      // Quick scale pop
      scaleAnim.value = withSequence(
        withTiming(1.3, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(0.85, { duration: 100 }),
        withSpring(1, { damping: 15, stiffness: 200 })
      );

      // 360° spin
      spinAnim.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

      // Wobble at the end
      wobbleAnim.value = withSequence(
        withDelay(400, withTiming(1, { duration: 80 })),
        withTiming(-1, { duration: 80 }),
        withTiming(0.5, { duration: 60 }),
        withTiming(-0.5, { duration: 60 }),
        withTiming(0, { duration: 50 })
      );

      setTimeout(() => {
        if (!mounted) return;
        spinAnim.value = 0;
        setShowSparkles(false);
        sparkleAnims.forEach(s => {
          s.x.value = 0;
          s.y.value = 0;
          s.opacity.value = 0;
          s.scale.value = 0;
        });
        setTimeout(() => {
          if (mounted) runBurst();
        }, 4000);
      }, 1000);
    };

    const timeout = setTimeout(runBurst, 2000);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // ── Animated Styles ──
  const glowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(glowAnim.value, [0, 1], [1, 1.5]) }],
      opacity: interpolate(glowAnim.value, [0, 0.5, 1], [0.15, 0.4, 0.15])
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const yFloat = interpolate(floatAnim.value, [0, 1], [0, -4]);
    const yBurst = interpolate(burstAnim.value, [0, 1], [0, -12]);
    const spinDeg = interpolate(spinAnim.value, [0, 1], [0, 360]);
    const wobbleDeg = interpolate(wobbleAnim.value, [-1, 1], [-18, 18]);
    
    return {
      transform: [
        { translateY: yFloat + yBurst },
        { scale: scaleAnim.value },
        { rotate: `${spinDeg}deg` },
        { rotate: `${wobbleDeg}deg` }
      ]
    };
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.wrapper}>
      {/* Glow ring */}
      <Animated.View style={[styles.glowRing, glowStyle]} />

      {/* Sparkle particles */}
      {showSparkles && sparkleAnims.map((s, i) => (
        <AnimatedSparkle key={`sparkle-${i}`} s={s} colors={colors} styles={styles} />
      ))}

      {/* Main icon container */}
      <Animated.View style={[styles.iconBtn, iconStyle]}>
        <ShoppingCartIcon size={20} color={colors.accentLight} />
      </Animated.View>
    </TouchableOpacity>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  wrapper: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  glowRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    backgroundColor: "transparent"
  },
  sparkle: {
    position: "absolute"
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  }
});