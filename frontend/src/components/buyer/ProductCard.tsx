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
import { FREE_DELIVERY_THRESHOLD } from "@/constants/delivery";

type ProductCardProps = {
  product: Product;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

export const ProductCard = React.memo(function ProductCard({ product, index = 0, style }: ProductCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
  const rating = Math.min(5, Math.max(0, Number(product.rating) || 0));
  const reviewCount = Number(product.reviews) || 0;
  // Shown only when the M.R.P. genuinely exceeds the selling price, so a card never
  // advertises a discount that isn't there.
  const comparePrice = Number(product.compare_price) || 0;
  const discountPercent =
    comparePrice > product.price
      ? Math.round(((comparePrice - product.price) / comparePrice) * 100)
      : 0;

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
                  // The well is now square and full-bleed, so it asks for the card's
                  // full width rather than the old letterboxed strip.
                  displayWidth={190}
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
              {/* Two lines, like Amazon. These titles carry the pack size ("5x100g +
                  1 Kg Sargam") which is exactly what separates one listing from the
                  next here — truncating at one line cut it off on every card. */}
              <Text style={styles.title} numberOfLines={2}>
                {product.title}
              </Text>

              {/* Only rendered when the product actually carries a rating. There is no reviews
                  feature yet, so today this row is absent rather than showing invented stars. */}
              {rating > 0 ? (
                <View style={styles.ratingRow}>
                  <Text style={styles.stars}>{"★".repeat(Math.round(rating)).padEnd(5, "☆")}</Text>
                  {reviewCount > 0 ? <Text style={styles.reviews}>{reviewCount}</Text> : null}
                </View>
              ) : null}

              <View style={styles.priceRow}>
                {discountPercent > 0 ? (
                  <Text style={styles.discount}>-{discountPercent}%</Text>
                ) : null}
                <Text style={styles.newPrice}>
                  {formatCurrency(product.price)}
                </Text>
              </View>
              {product.compare_price ? (
                <Text style={styles.oldPrice}>
                  M.R.P: <Text style={styles.oldPriceStrike}>{formatCurrency(product.compare_price)}</Text>
                </Text>
              ) : null}

              {/* The fee depends on the whole cart, so the card states the rule rather than
                  promising free delivery on an item that would not qualify on its own. */}
              <Text style={styles.deliveryText} numberOfLines={1}>
                {product.price >= FREE_DELIVERY_THRESHOLD
                  ? "FREE Delivery by OmniQ"
                  : `FREE Delivery over ${formatCurrency(FREE_DELIVERY_THRESHOLD)}`}
              </Text>
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
    // The card now derives a discount badge from compare_price and renders images[0],
    // so both have to be compared or an edited price or replaced photo would not repaint.
    prev.product.compare_price === next.product.compare_price &&
    prev.product.images?.[0] === next.product.images?.[0] &&
    prev.product.title === next.product.title &&
    prev.product.rating === next.product.rating &&
    prev.product.reviews === next.product.reviews &&
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
    // ⚡ A square image well, sized off the card's own width rather than a fixed
    // height. 103 of the 107 catalogue photos are square, so this matches their
    // native shape exactly: the product fills the well instead of being letterboxed
    // into a 140dp-tall strip that left most of the card empty. Roughly 2.7x the
    // on-screen image area, which is the difference between squinting at a card
    // and recognising the product at a glance.
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    // Product shots carry their own whitespace; the well adds only enough to keep
    // the image off the card border.
    padding: 6,
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
    // Two lines' worth, reserved whether or not the title wraps, so the price and
    // delivery lines sit at the same height across a row of mismatched titles.
    minHeight: 36,
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
    fontSize: 18,
    fontWeight: "700",
  },
  discount: {
    color: "#CC0C39", // Amazon's deal red
    fontSize: 14,
    fontWeight: "700",
  },
  oldPrice: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  // Only the number is struck through — striking "M.R.P:" as well reads as though
  // the label itself were cancelled.
  oldPriceStrike: {
    textDecorationLine: "line-through",
  },
  deliveryText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});