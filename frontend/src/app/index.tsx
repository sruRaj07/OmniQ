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
import { StyleSheet, View, Animated, Easing, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/store/useThemeStore";
import { supabase } from "@/lib/supabase";
const PARTICLE_COUNT = 14;
const ORBIT_COUNT = 5;
const BRAND_LETTERS = ["O", "M", "N", "I", "Q"];
const ND = Platform.OS !== "web"; // useNativeDriver flag

export default function SplashScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  // ── Master fade (controls final exit) ──
  const masterOpacity = useRef(new Animated.Value(1)).current;

  // ── Phase 0: Floating particle field ──
  const particleField = useRef(Array.from({
    length: PARTICLE_COUNT
  }, () => ({
    x: new Animated.Value(Math.random() * 300 - 150),
    y: new Animated.Value(Math.random() * 600 - 300),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(Math.random() * 0.6 + 0.4)
  }))).current;

  // ── Phase 1: Logo entrance ──
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // ── Shockwave burst ──
  const shockwaveScale = useRef(new Animated.Value(0.3)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;
  const shockwave2Scale = useRef(new Animated.Value(0.3)).current;
  const shockwave2Opacity = useRef(new Animated.Value(0)).current;

  // ── Phase 2: Glow pulse ──
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // ── Orbiting sparkles ──
  const orbitAngle = useRef(new Animated.Value(0)).current;
  const orbitOpacity = useRef(new Animated.Value(0)).current;

  // ── Phase 3: Letter reveal ──
  const letterAnims = useRef(BRAND_LETTERS.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(20)
  }))).current;

  // ── Phase 4: Tagline ──
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;

  // ── Logo idle breathing (after entrance) ──
  const breatheScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    // ═══════════════════════════════════════
    // PHASE 0: Particle field materializes
    // ═══════════════════════════════════════
    const particleAnimations = particleField.map((p, i) => {
      const delay = i * 40;
      // Fade particles in
      const fadeIn = Animated.timing(p.opacity, {
        toValue: Math.random() * 0.5 + 0.2,
        duration: 800,
        delay,
        useNativeDriver: ND
      });
      // Drift them slowly forever
      const driftY = Animated.loop(Animated.sequence([Animated.timing(p.y, {
        toValue: (Math.random() - 0.5) * 500,
        duration: 4000 + Math.random() * 3000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: ND
      }), Animated.timing(p.y, {
        toValue: (Math.random() - 0.5) * 500,
        duration: 4000 + Math.random() * 3000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: ND
      })]));
      const driftX = Animated.loop(Animated.sequence([Animated.timing(p.x, {
        toValue: (Math.random() - 0.5) * 250,
        duration: 5000 + Math.random() * 3000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: ND
      }), Animated.timing(p.x, {
        toValue: (Math.random() - 0.5) * 250,
        duration: 5000 + Math.random() * 3000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: ND
      })]));
      // Twinkle
      const twinkle = Animated.loop(Animated.sequence([Animated.timing(p.opacity, {
        toValue: Math.random() * 0.3 + 0.1,
        duration: 1500 + Math.random() * 1000,
        useNativeDriver: ND
      }), Animated.timing(p.opacity, {
        toValue: Math.random() * 0.6 + 0.3,
        duration: 1500 + Math.random() * 1000,
        useNativeDriver: ND
      })]));
      return Animated.parallel([fadeIn, driftY, driftX, twinkle]);
    });
    Animated.parallel(particleAnimations).start();

    // ═══════════════════════════════════════
    // PHASE 1: Logo dramatic entrance (at 600ms)
    // ═══════════════════════════════════════
    Animated.sequence([Animated.delay(600), Animated.parallel([
    // Logo fades in
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: ND
    }),
    // Logo springs in from 0 → 1 with overshoot
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: ND
    }),
    // Logo rotates 720° (2 full spins) during entrance
    Animated.timing(logoRotation, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: ND
    }),
    // Shockwave 1: fast expanding ring
    Animated.sequence([Animated.delay(200), Animated.parallel([Animated.timing(shockwaveScale, {
      toValue: 3.5,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: ND
    }), Animated.sequence([Animated.timing(shockwaveOpacity, {
      toValue: 0.8,
      duration: 150,
      useNativeDriver: ND
    }), Animated.timing(shockwaveOpacity, {
      toValue: 0,
      duration: 550,
      easing: Easing.out(Easing.ease),
      useNativeDriver: ND
    })])])]),
    // Shockwave 2: second delayed ring
    Animated.sequence([Animated.delay(350), Animated.parallel([Animated.timing(shockwave2Scale, {
      toValue: 2.8,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: ND
    }), Animated.sequence([Animated.timing(shockwave2Opacity, {
      toValue: 0.5,
      duration: 120,
      useNativeDriver: ND
    }), Animated.timing(shockwave2Opacity, {
      toValue: 0,
      duration: 480,
      easing: Easing.out(Easing.ease),
      useNativeDriver: ND
    })])])])])]).start();

    // ═══════════════════════════════════════
    // PHASE 2: Glow pulse + orbiting sparkles (at 1200ms)
    // ═══════════════════════════════════════
    Animated.sequence([Animated.delay(1200), Animated.parallel([
    // Glow ring breathes
    Animated.loop(Animated.sequence([Animated.parallel([Animated.timing(glowScale, {
      toValue: 1.4,
      duration: 2000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: ND
    }), Animated.timing(glowOpacity, {
      toValue: 0.4,
      duration: 2000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: ND
    })]), Animated.parallel([Animated.timing(glowScale, {
      toValue: 0.9,
      duration: 2000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: ND
    }), Animated.timing(glowOpacity, {
      toValue: 0.1,
      duration: 2000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: ND
    })])])),
    // Orbiting sparkles spin forever
    Animated.timing(orbitOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: ND
    }), Animated.loop(Animated.timing(orbitAngle, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: ND
    })),
    // Logo starts gentle breathing
    Animated.loop(Animated.sequence([Animated.timing(breatheScale, {
      toValue: 1.06,
      duration: 1500,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: ND
    }), Animated.timing(breatheScale, {
      toValue: 0.96,
      duration: 1500,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: ND
    })]))])]).start();

    // ═══════════════════════════════════════
    // PHASE 3: Letter-by-letter "OMNIQ" reveal (at 2000ms)
    // ═══════════════════════════════════════
    const letterRevealAnims = letterAnims.map((l, i) => Animated.sequence([Animated.delay(2000 + i * 120), Animated.parallel([Animated.timing(l.opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: ND
    }), Animated.spring(l.translateY, {
      toValue: 0,
      friction: 5,
      tension: 100,
      useNativeDriver: ND
    })])]));
    Animated.parallel(letterRevealAnims).start();

    // ═══════════════════════════════════════
    // PHASE 4: Tagline "Shop the Future" (at 2800ms)
    // ═══════════════════════════════════════
    Animated.sequence([Animated.delay(2800), Animated.parallel([Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: ND
    }), Animated.spring(taglineY, {
      toValue: 0,
      friction: 6,
      tension: 60,
      useNativeDriver: ND
    })])]).start();

    // ═══════════════════════════════════════
    // AUTH CHECK + PHASE 5: Cinematic exit
    // ═══════════════════════════════════════
    const checkAuthAndRedirect = async () => {
      const startTime = Date.now();
      let targetRoute = "/(auth)";
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (session?.user) {
          const {
            data: profile
          } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
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
        Animated.timing(masterOpacity, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: ND
        }).start(() => {
          router.replace(targetRoute as any);
        });
      }, remainingTime);
    };
    checkAuthAndRedirect();
  }, []);

  // ── Interpolations ──
  const logoSpin = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"]
  });
  const orbitRotation = orbitAngle.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });
  return <Animated.View style={[styles.container, {
    opacity: masterOpacity
  }]}>

      {/* ── Floating particle field ── */}
      {particleField.map((p, i) => <Animated.View key={`particle-${i}`} style={[styles.particle, {
      width: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
      height: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
      borderRadius: 2,
      backgroundColor: i % 4 === 0 ? colors.accentLight : i % 4 === 1 ? colors.goldLight : i % 4 === 2 ? colors.accent : colors.textMuted,
      opacity: p.opacity,
      transform: [{
        translateX: p.x
      }, {
        translateY: p.y
      }, {
        scale: p.scale
      }]
    }]} />)}

      {/* ── Shockwave ring 1 ── */}
      <Animated.View style={[styles.shockwave, {
      opacity: shockwaveOpacity,
      transform: [{
        scale: shockwaveScale
      }]
    }]} />

      {/* ── Shockwave ring 2 ── */}
      <Animated.View style={[styles.shockwave2, {
      opacity: shockwave2Opacity,
      transform: [{
        scale: shockwave2Scale
      }]
    }]} />

      {/* ── Glow pulse ── */}
      <Animated.View style={[styles.glowRing, {
      opacity: glowOpacity,
      transform: [{
        scale: glowScale
      }]
    }]} />

      {/* ── Orbiting sparkles ── */}
      <Animated.View style={[styles.orbitContainer, {
      opacity: orbitOpacity,
      transform: [{
        rotate: orbitRotation
      }]
    }]}>
        {Array.from({
        length: ORBIT_COUNT
      }).map((_, i) => {
        const angle = i / ORBIT_COUNT * 360;
        const radius = 95;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        return <View key={`orbit-${i}`} style={[styles.orbitDot, {
          left: 95 + x - (i % 2 === 0 ? 3 : 2),
          top: 95 + y - (i % 2 === 0 ? 3 : 2),
          width: i % 2 === 0 ? 6 : 4,
          height: i % 2 === 0 ? 6 : 4,
          borderRadius: 3,
          backgroundColor: i % 2 === 0 ? colors.goldLight : colors.accentLight
        }]} />;
      })}
      </Animated.View>

      {/* ── Logo "Q" ── */}
      <Animated.View style={[styles.logoContainer, {
      opacity: logoOpacity,
      transform: [{
        scale: Animated.multiply(logoScale, breatheScale)
      }, {
        rotate: logoSpin
      }]
    }]}>
        <Animated.Text style={styles.logoText}>Q</Animated.Text>
      </Animated.View>

      {/* ── Brand letters "O M N I Q" ── */}
      <View style={styles.brandRow}>
        {BRAND_LETTERS.map((letter, i) => <Animated.Text key={`letter-${i}`} style={[styles.brandLetter, i === 4 && styles.brandLetterAccent,
      // The Q gets accent color
      {
        opacity: letterAnims[i].opacity,
        transform: [{
          translateY: letterAnims[i].translateY
        }]
      }]}>
            {letter}
          </Animated.Text>)}
      </View>

      {/* ── Tagline ── */}
      <Animated.Text style={[styles.tagline, {
      opacity: taglineOpacity,
      transform: [{
        translateY: taglineY
      }]
    }]}>
        Shop the Future
      </Animated.Text>
    </Animated.View>;
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
    ...Platform.select({
      web: {
        boxShadow: `0 0 6px ${colors.goldLight}`
      },
      default: {
        shadowColor: colors.goldLight,
        shadowOffset: {
          width: 0,
          height: 0
        },
        shadowOpacity: 0.9,
        shadowRadius: 4,
        elevation: 4
      }
    })
  },
  // ── Logo ──
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: `0 0 50px ${colors.accent}, 0 0 100px rgba(108, 99, 255, 0.3)`
      },
      default: {
        shadowColor: colors.accent,
        shadowOffset: {
          width: 0,
          height: 0
        },
        shadowOpacity: 0.9,
        shadowRadius: 40,
        elevation: 20
      }
    })
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