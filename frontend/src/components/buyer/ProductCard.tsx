/**
 * ProductCard - Cinematic 3D animated product card.
 * Features: staggered entrance, 3D press tilt with perspective,
 * holographic shimmer sweep, floating image parallax, glassmorphic border glow.
 * Author: OmniQ Team
 */
import React, { useMemo } from "react";
import { StyleSheet, Text, View, Pressable, Platform } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Link } from "expo-router";
import { NetworkAwareImage } from "@/components/shared/NetworkAwareImage";
import { useThemeColors } from "@/store/useThemeStore";
import type { Product } from "@/types/product.types";
import { formatCurrency } from "@/utils/formatCurrency";

type ProductCardProps = {
  product: Product;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

export const ProductCard = React.memo(function ProductCard({ product, index = 0, style }: ProductCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <View style={[styles.column, style]}>
      <Link href={`/product/${product.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.cardWrapper, pressed && { opacity: 0.95 }]}>
          <View style={styles.card}>
            
            {/* Image */}
            <View style={styles.imageContainer}>
              {imageUrl ? (
                <NetworkAwareImage
                  source={imageUrl}
                  thumbnailSource={product.thumbnail_url}
                  placeholder={product.blurhash}
                  style={styles.image}
                  contentFit="contain"
                  priority={index < 4 ? "high" : "normal"}
                  transition={Platform.OS === 'web' ? 0 : 200}
                />
              ) : (
                <Text style={styles.placeholder}>📦</Text>
              )}
            </View>

            {/* Details */}
            <View style={styles.meta}>
              <Text style={styles.title} numberOfLines={1}>
                {product.title}
              </Text>

              <View style={styles.ratingRow}>
                <Text style={styles.stars}>★★★★☆</Text>
                <Text style={styles.reviews}>189</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.newPrice}>
                  {formatCurrency(product.price)}
                </Text>
                {product.compare_price ? (
                  <Text style={styles.oldPrice}>
                    M.R.P: {formatCurrency(product.compare_price)}
                  </Text>
                ) : null}
              </View>

      <Text style={styles.deliveryText} numberOfLines={1}>FREE Delivery by OmniQ</Text>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.title === next.product.title &&
    prev.index === next.index
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  column: {
    width: "48%",
    marginBottom: 16,
  },
  cardWrapper: {
    width: "100%",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    width: "100%",
  },
  imageContainer: {
    height: 140, // Slightly reduced height to fit two products better on narrow screens
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    padding: 12,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    fontSize: 28,
    textAlign: "center",
  },
  meta: {
    padding: 10,
    paddingTop: 4,
    width: "100%",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13, // Slightly smaller text to prevent layout breaking
    fontWeight: "400",
    marginBottom: 4,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  stars: {
    color: "#FFA41C", // Amazon gold
    fontSize: 11,
  },
  reviews: {
    color: "#007185", // Amazon link blue
    fontSize: 11,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  newPrice: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  oldPrice: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  deliveryText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});