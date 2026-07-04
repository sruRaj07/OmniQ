/**
 * AnimatedCartButton - A show-stopping, multi-layered animated cart icon.
 * Features: floating levitation, pulsing glow ring, sparkle particles,
 * periodic excitement burst (jump + spin + wobble), and morphing icon swap.
 * Author: OmniQ Team
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, TouchableOpacity } from "react-native";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { SparklesIcon } from "@/components/ui/SparklesIcon";
import { colors } from "@/constants/colors";

const SPARKLE_COUNT = 6;

export function AnimatedCartButton({ onPress }: { onPress?: () => void }) {
  // ── Core Animations ──
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const [showSparkles, setShowSparkles] = useState(false);

  // Sparkle particles
  const sparkleAnims = useRef(
    Array.from({ length: SPARKLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // ── 1. Gentle floating / levitation (always running) ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ── 2. Glow pulse ring (always running) ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ── 3. Excitement burst cycle (periodic) ──
  useEffect(() => {
    let mounted = true;

    const runBurst = () => {
      if (!mounted) return;
      setShowSparkles(true);

      // Fire sparkle particles outward
      const sparkleAnimations = sparkleAnims.map((s, i) => {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
        const distance = 18 + Math.random() * 10;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;
        return Animated.parallel([
          Animated.timing(s.x, { toValue: targetX, duration: 400, useNativeDriver: true }),
          Animated.timing(s.y, { toValue: targetY, duration: 400, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(s.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(s.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(s.scale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
            Animated.timing(s.scale, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]),
        ]);
      });

      Animated.parallel([
        // Jump up
        Animated.sequence([
          Animated.timing(burstAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(burstAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
        ]),
        // Quick scale pop
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]),
        // 360° spin
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Wobble at the end
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(wobbleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: -1, duration: 80, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: 0.5, duration: 60, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: -0.5, duration: 60, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
        // Sparkle particles
        ...sparkleAnimations,
      ]).start(() => {
        if (!mounted) return;
        spinAnim.setValue(0);
        setShowSparkles(false);
        // Reset sparkle positions
        sparkleAnims.forEach((s) => {
          s.x.setValue(0);
          s.y.setValue(0);
          s.opacity.setValue(0);
          s.scale.setValue(0);
        });
        // Schedule next burst
        setTimeout(() => {
          if (mounted) runBurst();
        }, 4000);
      });
    };

    // Start first burst after a delay
    const timeout = setTimeout(runBurst, 2000);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // ── Interpolations ──
  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.4, 0.15],
  });

  const burstY = burstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const wobbleRotation = wobbleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-18deg", "18deg"],
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.wrapper}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Sparkle particles */}
      {showSparkles &&
        sparkleAnims.map((s, i) => (
          <Animated.View
            key={`sparkle-${i}`}
            style={[
              styles.sparkle,
              {
                transform: [
                  { translateX: s.x },
                  { translateY: s.y },
                  { scale: s.scale },
                ],
                opacity: s.opacity,
              },
            ]}
          >
            <SparklesIcon size={8} color={colors.goldLight} />
          </Animated.View>
        ))}

      {/* Main icon container */}
      <Animated.View
        style={[
          styles.iconBtn,
          {
            transform: [
              { translateY: Animated.add(floatY, burstY) },
              { scale: scaleAnim },
              { rotate: spinRotation },
              { rotate: wobbleRotation },
            ],
          },
        ]}
      >
        <ShoppingCartIcon size={20} color={colors.accentLight} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    backgroundColor: "transparent",
  },
  sparkle: {
    position: "absolute",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
