/**
 * OmniQ Splash Screen — Cinematic, million-dollar entrance animation.
 *
 * Animation Timeline:
 *   Phase 0  (0–600ms)   : Floating particle field fades in
 *   Phase 1  (600–1200ms): "Q" logo slams in with spring + rotation + shockwave burst
 *   Phase 2  (1200–2000ms): Glow ring pulses, orbiting sparkles appear
 *   Phase 3  (2000–2800ms): "OMNIQ" letters reveal one by one (staggered)
 *   Phase 4  (2800–3400ms): Tagline fades up
 *   Phase 5  (3800–4300ms): Cinematic fade-to-black exit
 *
 * Author: OmniQ Team
 */
import { useEffect, useRef } from "react";
import { StyleSheet, View, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withSequence, withRepeat, Easing, interpolate, runOnJS } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/store/useThemeStore";
import { supabase } from "@/lib/supabase";

const PARTICLE_COUNT = 14;
const ORBIT_COUNT = 5;
const BRAND_LETTERS = ["O", "M", "N", "I", "Q"];

// Sub-component for individual letters to cleanly use hooks
function AnimatedLetter({ letter, index, anims, style, accentStyle }: any) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: anims.opacity.value,
    transform: [{ translateY: anims.translateY.value }]
  }));
  return (
    <Animated.Text style={[style, index === 4 && accentStyle, animatedStyle]}>
      {letter}
    </Animated.Text>
  );
}

// Sub-component for particles to cleanly use hooks
function AnimatedParticle({ particle, index, colors, styles }: any) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: particle.opacity.value,
    transform: [
      { translateX: particle.x.value },
      { translateY: particle.y.value },
      { scale: particle.scale.value }
    ]
  }));
  
  return (
    <Animated.View style={[
      styles.particle,
      {
        width: index % 3 === 0 ? 4 : index % 3 === 1 ? 3 : 2,
        height: index % 3 === 0 ? 4 : index % 3 === 1 ? 3 : 2,
        borderRadius: 2,
        backgroundColor: index % 4 === 0 ? colors.accentLight : index % 4 === 1 ? colors.goldLight : index % 4 === 2 ? colors.accent : colors.textMuted,
      },
      animatedStyle
    ]} />
  );
}

export default function SplashScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  // ── Master fade (controls final exit) ──
  const masterOpacity = useSharedValue(1);

  // ── Phase 0: Floating particle field ──
  const particleField = useRef(Array.from({ length: PARTICLE_COUNT }, () => ({
    x: useSharedValue(Math.random() * 300 - 150),
    y: useSharedValue(Math.random() * 600 - 300),
    opacity: useSharedValue(0),
    scale: useSharedValue(Math.random() * 0.6 + 0.4)
  }))).current;

  // ── Phase 1: Logo entrance ──
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  // ── Shockwave burst ──
  const shockwaveScale = useSharedValue(0.3);
  const shockwaveOpacity = useSharedValue(0);
  const shockwave2Scale = useSharedValue(0.3);
  const shockwave2Opacity = useSharedValue(0);

  // ── Phase 2: Glow pulse ──
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);

  // ── Orbiting sparkles ──
  const orbitAngle = useSharedValue(0);
  const orbitOpacity = useSharedValue(0);

  // ── Phase 3: Letter reveal ──
  const letterAnims = useRef(BRAND_LETTERS.map(() => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(20)
  }))).current;

  // ── Phase 4: Tagline ──
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(12);

  // ── Logo idle breathing (after entrance) ──
  const breatheScale = useSharedValue(1);

  useEffect(() => {
    let mounted = true;

    // ═══════════════════════════════════════
    // PHASE 0: Particle field materializes
    // ═══════════════════════════════════════
    particleField.forEach((p, i) => {
      const delay = i * 40;
      
      setTimeout(() => {
        if (!mounted) return;
        // Fade in then twinkle
        p.opacity.value = withSequence(
          withTiming(Math.random() * 0.5 + 0.2, { duration: 800 }),
          withRepeat(
            withSequence(
              withTiming(Math.random() * 0.3 + 0.1, { duration: 1500 + Math.random() * 1000 }),
              withTiming(Math.random() * 0.6 + 0.3, { duration: 1500 + Math.random() * 1000 })
            ),
            -1,
            false
          )
        );
      }, delay);

      p.y.value = withRepeat(
        withSequence(
          withTiming((Math.random() - 0.5) * 500, { duration: 4000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming((Math.random() - 0.5) * 500, { duration: 4000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );

      p.x.value = withRepeat(
        withSequence(
          withTiming((Math.random() - 0.5) * 250, { duration: 5000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming((Math.random() - 0.5) * 250, { duration: 5000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    });

    // ═══════════════════════════════════════
    // PHASE 1: Logo dramatic entrance (at 600ms)
    // ═══════════════════════════════════════
    logoOpacity.value = withDelay(600, withTiming(1, { duration: 200 }));
    logoScale.value = withDelay(600, withSpring(1, { damping: 10, stiffness: 80 }));
    logoRotation.value = withDelay(600, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));

    shockwaveScale.value = withDelay(800, withTiming(3.5, { duration: 700, easing: Easing.out(Easing.cubic) }));
    shockwaveOpacity.value = withDelay(800, withSequence(
      withTiming(0.8, { duration: 150 }),
      withTiming(0, { duration: 550, easing: Easing.out(Easing.ease) })
    ));

    shockwave2Scale.value = withDelay(950, withTiming(2.8, { duration: 600, easing: Easing.out(Easing.cubic) }));
    shockwave2Opacity.value = withDelay(950, withSequence(
      withTiming(0.5, { duration: 120 }),
      withTiming(0, { duration: 480, easing: Easing.out(Easing.ease) })
    ));

    // ═══════════════════════════════════════
    // PHASE 2: Glow pulse + orbiting sparkles (at 1200ms)
    // ═══════════════════════════════════════
    glowScale.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(1.4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    ));

    glowOpacity.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    ));

    orbitOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
    orbitAngle.value = withDelay(1200, withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    ));

    breatheScale.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    ));

    // ═══════════════════════════════════════
    // PHASE 3: Letter-by-letter "OMNIQ" reveal (at 2000ms)
    // ═══════════════════════════════════════
    letterAnims.forEach((l, i) => {
      l.opacity.value = withDelay(2000 + i * 120, withTiming(1, { duration: 300 }));
      l.translateY.value = withDelay(2000 + i * 120, withSpring(0, { damping: 10, stiffness: 100 }));
    });

    // ═══════════════════════════════════════
    // PHASE 4: Tagline "Shop the Future" (at 2800ms)
    // ═══════════════════════════════════════
    taglineOpacity.value = withDelay(2800, withTiming(1, { duration: 600 }));
    taglineY.value = withDelay(2800, withSpring(0, { damping: 12, stiffness: 60 }));

    // ═══════════════════════════════════════
    // AUTH CHECK + PHASE 5: Cinematic exit
    // ═══════════════════════════════════════
    const checkAuthAndRedirect = async () => {
      const startTime = Date.now();
      let targetRoute = "/(auth)";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
          if (profile?.role === "seller") {
            targetRoute = "/(seller)";
          } else {
            targetRoute = "/(buyer)";
          }
        }
      } catch (err) {
        console.error("Auth check failed during splash:", err);
      }

      // Ensure splash is visible for at least 4.3s so the full animation plays
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 4300 - elapsed);
      setTimeout(() => {
        if (!mounted) return;
        masterOpacity.value = withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }, () => {
          runOnJS(router.replace)(targetRoute as any);
        });
      }, remainingTime);
    };

    checkAuthAndRedirect();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Animated Styles ──
  const containerStyle = useAnimatedStyle(() => ({
    opacity: masterOpacity.value
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value * breatheScale.value },
      { rotate: `${interpolate(logoRotation.value, [0, 1], [0, 720])}deg` }
    ]
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: orbitOpacity.value,
    transform: [
      { rotate: `${interpolate(orbitAngle.value, [0, 1], [0, 360])}deg` }
    ]
  }));

  const shockwave1Style = useAnimatedStyle(() => ({
    opacity: shockwaveOpacity.value,
    transform: [{ scale: shockwaveScale.value }]
  }));

  const shockwave2Style = useAnimatedStyle(() => ({
    opacity: shockwave2Opacity.value,
    transform: [{ scale: shockwave2Scale.value }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }]
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }]
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* ── Floating particle field ── */}
      {particleField.map((p, i) => (
        <AnimatedParticle key={`particle-${i}`} particle={p} index={i} colors={colors} styles={styles} />
      ))}

      {/* ── Shockwave ring 1 ── */}
      <Animated.View style={[styles.shockwave, shockwave1Style]} />

      {/* ── Shockwave ring 2 ── */}
      <Animated.View style={[styles.shockwave2, shockwave2Style]} />

      {/* ── Glow pulse ── */}
      <Animated.View style={[styles.glowRing, glowStyle]} />

      {/* ── Orbiting sparkles ── */}
      <Animated.View style={[styles.orbitContainer, orbitStyle]}>
        {Array.from({ length: ORBIT_COUNT }).map((_, i) => {
          const angle = (i / ORBIT_COUNT) * 360;
          const radius = 95;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          return (
            <View
              key={`orbit-${i}`}
              style={[
                styles.orbitDot,
                {
                  left: 95 + x - (i % 2 === 0 ? 3 : 2),
                  top: 95 + y - (i % 2 === 0 ? 3 : 2),
                  width: i % 2 === 0 ? 6 : 4,
                  height: i % 2 === 0 ? 6 : 4,
                  borderRadius: 3,
                  backgroundColor: i % 2 === 0 ? colors.goldLight : colors.accentLight,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* ── Logo "Q" ── */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Animated.Text style={styles.logoText}>Q</Animated.Text>
      </Animated.View>

      {/* ── Brand letters "O M N I Q" ── */}
      <View style={styles.brandRow}>
        {BRAND_LETTERS.map((letter, i) => (
          <AnimatedLetter 
            key={`letter-${i}`} 
            letter={letter} 
            index={i} 
            anims={letterAnims[i]} 
            style={styles.brandLetter} 
            accentStyle={styles.brandLetterAccent} 
          />
        ))}
      </View>

      {/* ── Tagline ── */}
      <Animated.Text style={[styles.tagline, taglineStyle]}>
        Shop the Future
      </Animated.Text>
    </Animated.View>
  );
}
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  // ── Particles ──
  particle: {
    position: "absolute"
  },
  // ── Shockwaves ──
  shockwave: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: colors.accentLight,
    backgroundColor: "transparent"
  },
  shockwave2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: colors.goldLight,
    backgroundColor: "transparent"
  },
  // ── Glow ──
  glowRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.accent
  },
  // ── Orbiting dots container ──
  orbitContainer: {
    position: "absolute",
    width: 190,
    height: 190
  },
  orbitDot: {
    position: "absolute",
    boxShadow: `0 0 6px ${colors.goldLight}`,
    elevation: 4
  },
  // ── Logo ──
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 50px ${colors.accent}`,
    elevation: 20
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  // ── Brand text ──
  brandRow: {
    flexDirection: "row",
    marginTop: 40,
    gap: 6
  },
  brandLetter: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: 4
  },
  brandLetterAccent: {
    color: colors.accentLight
  },
  // ── Tagline ──
  tagline: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 3,
    textTransform: "uppercase"
  }
});