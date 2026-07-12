/**
 * AnimatedEmptyCart - A playful, eye-catching empty cart animation.
 * The cart floats, spins, bounces, wiggles, and emits sparkles
 * to keep the empty state delightful rather than boring.
 * Author: OmniQ Team
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { SparklesIcon } from "@/components/ui/SparklesIcon";
import { useAppTheme } from "@/store/useThemeStore";
const SPARKLE_COUNT = 8;
export function AnimatedEmptyCart() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  // ── Core Animations ──
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;

  // Sparkle particles
  const sparkleAnims = useRef(Array.from({
    length: SPARKLE_COUNT
  }, () => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0)
  }))).current;

  // ── 1. Gentle floating / levitation (always running) ──
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(floatAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true
    }), Animated.timing(floatAnim, {
      toValue: 0,
      duration: 2000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true
    })])).start();
  }, []);

  // ── 2. Gentle tilt while floating ──
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(tiltAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true
    }), Animated.timing(tiltAnim, {
      toValue: -1,
      duration: 3000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true
    })])).start();
  }, []);

  // ── 3. Glow pulse ring (always running) ──
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(glowAnim, {
      toValue: 1,
      duration: 2500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    }), Animated.timing(glowAnim, {
      toValue: 0,
      duration: 2500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    })])).start();
  }, []);

  // ── 4. Excitement burst cycle (periodic) ──
  useEffect(() => {
    let mounted = true;
    const runBurst = () => {
      if (!mounted) return;

      // Fire sparkle particles outward
      const sparkleAnimations = sparkleAnims.map((s, i) => {
        const angle = i / SPARKLE_COUNT * Math.PI * 2;
        const distance = 35 + Math.random() * 20;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;
        return Animated.parallel([Animated.timing(s.x, {
          toValue: targetX,
          duration: 500,
          useNativeDriver: true
        }), Animated.timing(s.y, {
          toValue: targetY,
          duration: 500,
          useNativeDriver: true
        }), Animated.sequence([Animated.timing(s.opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true
        }), Animated.timing(s.opacity, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true
        })]), Animated.sequence([Animated.timing(s.scale, {
          toValue: 1.5,
          duration: 200,
          useNativeDriver: true
        }), Animated.timing(s.scale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })])]);
      });
      Animated.parallel([
      // Jump up
      Animated.sequence([Animated.timing(burstAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }), Animated.timing(burstAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.bounce,
        useNativeDriver: true
      })]),
      // Quick scale pop
      Animated.sequence([Animated.timing(scaleAnim, {
        toValue: 1.35,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }), Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 120,
        useNativeDriver: true
      }), Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 180,
        useNativeDriver: true
      })]),
      // 360° spin
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      // Post-landing wobble
      Animated.sequence([Animated.delay(500), Animated.timing(wobbleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true
      }), Animated.timing(wobbleAnim, {
        toValue: -1,
        duration: 80,
        useNativeDriver: true
      }), Animated.timing(wobbleAnim, {
        toValue: 0.6,
        duration: 60,
        useNativeDriver: true
      }), Animated.timing(wobbleAnim, {
        toValue: -0.6,
        duration: 60,
        useNativeDriver: true
      }), Animated.timing(wobbleAnim, {
        toValue: 0.3,
        duration: 50,
        useNativeDriver: true
      }), Animated.timing(wobbleAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true
      })]),
      // Sparkle particles
      ...sparkleAnimations]).start(() => {
        if (!mounted) return;
        spinAnim.setValue(0);
        // Reset sparkle positions
        sparkleAnims.forEach(s => {
          s.x.setValue(0);
          s.y.setValue(0);
          s.opacity.setValue(0);
          s.scale.setValue(0);
        });
        // Schedule next burst
        setTimeout(() => {
          if (mounted) runBurst();
        }, 3500);
      });
    };
    const timeout = setTimeout(runBurst, 1500);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // ── Interpolations ──
  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10]
  });
  const tiltRotation = tiltAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-8deg", "8deg"]
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.6]
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.08, 0.25, 0.08]
  });
  const burstY = burstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25]
  });
  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });
  const wobbleRotation = wobbleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-20deg", "20deg"]
  });
  return <View style={styles.container}>
      {/* Outer glow ring 1 */}
      <Animated.View style={[styles.glowRing, {
      transform: [{
        scale: glowScale
      }],
      opacity: glowOpacity
    }]} />

      {/* Outer glow ring 2 (delayed offset) */}
      <Animated.View style={[styles.glowRingInner, {
      transform: [{
        scale: Animated.add(glowScale, -0.2)
      }],
      opacity: Animated.add(glowOpacity, 0.05)
    }]} />

      {/* Sparkle particles */}
      {sparkleAnims.map((s, i) => <Animated.View key={`sparkle-${i}`} style={[styles.sparkle, {
      transform: [{
        translateX: s.x
      }, {
        translateY: s.y
      }, {
        scale: s.scale
      }],
      opacity: s.opacity
    }]}>
          <SparklesIcon size={12} color={i % 2 === 0 ? colors.goldLight : colors.accentLight} />
        </Animated.View>)}

      {/* Main cart icon */}
      <Animated.View style={[styles.iconCircle, {
      transform: [{
        translateY: Animated.add(floatY, burstY)
      }, {
        scale: scaleAnim
      }, {
        rotate: spinRotation
      }, {
        rotate: wobbleRotation
      }, {
        rotate: tiltRotation
      }]
    }]}>
        <ShoppingCartIcon size={48} color={colors.accentLight} />
      </Animated.View>
    </View>;
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