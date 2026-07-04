/**
 * ProductCard - Cinematic 3D animated product card.
 * Features: staggered entrance, 3D press tilt with perspective,
 * holographic shimmer sweep, floating image parallax, glassmorphic border glow.
 * Author: OmniQ Team
 */
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { Link } from "expo-router";
import { colors } from "@/constants/colors";
import type { Product } from "@/types/product.types";
import { formatCurrency } from "@/utils/formatCurrency";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // padding + gap

type ProductCardProps = {
  product: Product;
  index?: number;
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const imageUrl =
    product.images && product.images.length > 0 ? product.images[0] : null;

  // ── Animation Values ──
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const imageFloat = useRef(new Animated.Value(0)).current;

  // ── 1. Staggered entrance: scale up + fade in + slide up ──
  useEffect(() => {
    const delay = index * 120;
    const timer = setTimeout(() => {
      Animated.spring(entranceAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  // ── 2. Holographic shimmer sweep (continuous) ──
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // ── 3. Subtle card float / breathing ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500 + index * 200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500 + index * 200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ── 4. Border glow pulse ──
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

  // ── 5. Parallax image float ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(imageFloat, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(imageFloat, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ── Press handlers for 3D tilt ──
  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  // ── Interpolations ──
  const entranceScale = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const entranceOpacity = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const entranceSlide = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });

  const pressRotateX = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "4deg"],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_WIDTH * 1.5, CARD_WIDTH * 1.5],
  });

  const cardFloat = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  const imageParallax = imageFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4],
  });

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.link}
      >
        {/* Entrance animation wrapper */}
        <Animated.View
          style={[
            styles.entranceWrapper,
            {
              opacity: entranceOpacity,
              transform: [
                { translateY: entranceSlide },
                { scale: entranceScale },
              ],
            },
          ]}
        >
          {/* Outer glow halo */}
          <Animated.View
            style={[
              styles.glowHalo,
              {
                opacity: glowOpacity,
              },
            ]}
          />

          {/* 3D tilt + float wrapper */}
          <Animated.View
            style={[
              styles.card3DWrapper,
              {
                transform: [
                  { perspective: 800 },
                  { translateY: cardFloat },
                  { scale: pressScale },
                  { rotateX: pressRotateX },
                ],
              },
            ]}
          >
            {/* Main card */}
            <View style={styles.card}>
              {/* Holographic shimmer overlay */}
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    transform: [{ translateX: shimmerTranslate }],
                  },
                ]}
              />

              {/* Top accent line */}
              <View style={styles.accentLine} />

              {/* Image with parallax float */}
              <Animated.View
                style={[
                  styles.imageContainer,
                  {
                    transform: [{ translateY: imageParallax }],
                  },
                ]}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.placeholder}>📦</Text>
                )}
              </Animated.View>

              {/* Divider with glow */}
              <View style={styles.divider} />

              {/* Meta info */}
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={2}>
                  {product.title}
                </Text>
                <Text style={styles.sellerSubtitle}>by OmniQ Partner</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.newPrice}>
                    {formatCurrency(product.price)}
                  </Text>
                  {product.compare_price ? (
                    <Text style={styles.oldPrice}>
                      {formatCurrency(product.compare_price)}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.ratingRow}>
                  <Text style={styles.stars}>★★★★☆</Text>
                  <Text style={styles.reviews}>(189)</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    width: "48%",
    marginBottom: 16,
  },
  entranceWrapper: {
    position: "relative",
  },
  glowHalo: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card3DWrapper: {
    borderRadius: 20,
  },
  card: {
    backgroundColor: "#0F0F1A",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.15)",
    // iOS shadow for 3D depth
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    transform: [{ skewX: "-20deg" }],
    zIndex: 10,
  },
  accentLine: {
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.5,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  imageContainer: {
    height: 130,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    paddingTop: 20,
    backgroundColor: "rgba(108, 99, 255, 0.03)",
  },
  image: {
    width: "85%",
    height: "85%",
  },
  placeholder: {
    fontSize: 44,
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
    backgroundColor: "rgba(108, 99, 255, 0.12)",
  },
  meta: {
    padding: 12,
    paddingTop: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
    lineHeight: 18,
  },
  sellerSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  oldPrice: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  newPrice: {
    color: colors.goldLight,
    fontSize: 17,
    fontWeight: "900",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stars: {
    color: colors.goldLight,
    fontSize: 10,
  },
  reviews: {
    color: colors.textMuted,
    fontSize: 10,
  },
});
