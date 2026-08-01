/**
 * OmniQ Splash Screen — Amazon-style fast branding splash.
 *
 * Ultra-lightweight: logo fade-in + subtle scale → immediate auth check → navigate.
 * No particles, no shockwaves, no orbiting sparkles.
 * On web: ~300ms total. On native: ~1.2s total.
 *
 * Author: OmniQ Team
 */
import { useEffect } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/store/useThemeStore";
import { supabase } from "@/lib/supabase";

export default function SplashScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const router = useRouter();

  // Only 3 shared values — logo entrance + master fade
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const masterOpacity = useSharedValue(1);

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();

    // ── Quick logo entrance ──
    logoOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });

    // ── Auth check (runs concurrently with animation) ──
    const checkAuthAndRedirect = async () => {
      let targetRoute = "/(auth)";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (profile?.role === "seller") {
            targetRoute = "/(seller)";
          } else {
            targetRoute = "/(buyer)";
          }
        }
      } catch (err) {
        console.error("Auth check failed during splash:", err);
      }

      // On web: redirect instantly to avoid blocking First Contentful Paint.
      // On native: hold for 1.2s so users see the branding
      if (Platform.OS === "web") {
        if (!mounted) return;
        router.replace(targetRoute as any);
        return;
      }

      const targetDelay = 1200;
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, targetDelay - elapsed);

      setTimeout(() => {
        if (!mounted) return;
        masterOpacity.value = withTiming(
          0,
          { duration: 400, easing: Easing.inOut(Easing.ease) },
          () => {
            runOnJS(router.replace)(targetRoute as any);
          }
        );
      }, remainingTime);
    };

    checkAuthAndRedirect();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Animated Styles ──
  const containerStyle = useAnimatedStyle(() => ({
    opacity: masterOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* ── Logo badge ── */}
      <Animated.View style={[styles.logoBadge, logoStyle]}>
        <Text style={styles.logoText}>Q</Text>
      </Animated.View>

      {/* ── Brand name ── */}
      <Animated.Text style={[styles.brandName, logoStyle]}>
        OMNIQ
      </Animated.Text>

      {/* ── Tagline ── */}
      <Animated.Text style={[styles.tagline, logoStyle]}>
        Shop the Future
      </Animated.Text>
    </Animated.View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    logoBadge: {
      width: 100,
      height: 100,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 16,
    },
    logoText: {
      fontSize: 42,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    brandName: {
      marginTop: 24,
      fontSize: 32,
      fontWeight: "900",
      color: colors.textPrimary,
      letterSpacing: 8,
    },
    tagline: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      letterSpacing: 3,
      textTransform: "uppercase",
    },
  });