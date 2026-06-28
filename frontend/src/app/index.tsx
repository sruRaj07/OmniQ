import { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Easing, Platform } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";

export default function SplashScreen() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start breathing animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      )
    ]).start();

    // Check authentication in the background while animation plays
    const checkAuthAndRedirect = async () => {
      const startTime = Date.now();
      let targetRoute = "/(auth)";

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch user role to determine which dashboard to show
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

      // Ensure the splash screen is visible for at least 3 seconds
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);

      setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => {
          router.replace(targetRoute as any);
        });
      }, remainingTime);
    };

    checkAuthAndRedirect();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <Animated.Text style={styles.logoText}>Q</Animated.Text>
      </Animated.View>
      <Animated.Text style={[styles.brandText, { opacity: opacityAnim }]}>OMNIQ</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary, // Deep modern dark background
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accent, // Vibrant accent color
    alignItems: "center",
    justifyContent: "center",
    // Modern glow effect
    ...Platform.select({
      web: {
        boxShadow: `0px 0px 30px ${colors.accent}`,
      },
      default: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 15,
      }
    })
  },
  logoText: {
    fontSize: 80,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  brandText: {
    marginTop: 40,
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 8,
  }
});
