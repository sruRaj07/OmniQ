/**
 * OmniQ mobile app - seller inventory row.
 *
 * Built for scanning a long list: image, title, price with the discount the buyer sees,
 * and the two things that stop a listing from selling — approval state and stock.
 *
 * Author: OmniQ Team
 */
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NetworkAwareImage } from "@/components/shared/NetworkAwareImage";
import { StatusPill } from "@/components/seller/SellerUI";
import { useThemeColors } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { describeOptimization } from "@/utils/imageCompressor";
import {
  LOW_STOCK_THRESHOLD,
  RADIUS,
  SHADOW,
  SPACE,
  productStatusMeta,
  stockOf,
  withAlpha,
} from "@/constants/sellerTheme";
import { AlertIcon, ChevronRightIcon, ImageIcon } from "@/components/ui/SellerIcons";

type ProductListItemProps = {
  product: any;
  onEdit: (product: any) => void;
};

export const ProductListItem = memo(
  function ProductListItem({ product, onEdit }: ProductListItemProps) {
    const colors = useThemeColors();
    const styles = useMemo(() => getStyles(colors), [colors]);

    const status = productStatusMeta(product, colors);
    const stock = stockOf(product);
    const imageUrl = product.images?.[0] || null;

    // Tells the seller at a glance which listings still carry a heavy original.
    const optimization = describeOptimization(product.thumbnail_url || product.images?.[0]);

    const comparePrice = Number(product.compare_price) || 0;
    const price = Number(product.price) || 0;
    const discount = comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

    const stockTone =
      stock === 0 ? colors.danger : stock <= LOW_STOCK_THRESHOLD ? colors.warning : colors.textSecondary;

    return (
      <Pressable
        onPress={() => onEdit(product)}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${product.title}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {imageUrl ? (
          <NetworkAwareImage
            source={imageUrl}
            thumbnailSource={product.thumbnail_url}
            placeholder={product.blurhash}
            style={styles.image}
            displayWidth={68}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <ImageIcon size={20} color={colors.textMuted} strokeWidth={1.8} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(price)}</Text>
            {discount > 0 ? (
              <>
                <Text style={styles.comparePrice}>{formatCurrency(comparePrice)}</Text>
                <Text style={styles.discount}>{discount}% off</Text>
              </>
            ) : null}
          </View>

          <View style={styles.chips}>
            <StatusPill label={status.label} color={status.color} tint={status.tint} />
            <View style={styles.stockChip}>
              {stock <= LOW_STOCK_THRESHOLD ? <AlertIcon size={11} color={stockTone} strokeWidth={2.4} /> : null}
              <Text style={[styles.stockText, { color: stockTone }]}>
                {stock === 0 ? "Out of stock" : `${stock} in stock`}
              </Text>
            </View>
            {optimization && !optimization.isOptimized ? (
              <StatusPill
                label={optimization.label}
                color={colors.warning}
                tint={withAlpha(colors.warning, 0.12)}
              />
            ) : null}
          </View>
        </View>

        <ChevronRightIcon size={18} color={colors.textMuted} strokeWidth={2.2} />
      </Pressable>
    );
  },
  // ⚡ PERFORMANCE: the seller inventory refetches every 2 minutes and hands back new object
  // identities. Only redraw when something the row shows has actually changed.
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.product.title === next.product.title &&
    prev.product.price === next.product.price &&
    prev.product.compare_price === next.product.compare_price &&
    prev.product.stock === next.product.stock &&
    prev.product.is_approved === next.product.is_approved &&
    prev.product.is_flagged === next.product.is_flagged &&
    prev.product.thumbnail_url === next.product.thumbnail_url &&
    prev.product.images?.[0] === next.product.images?.[0] &&
    prev.onEdit === next.onEdit
);

const getStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      padding: SPACE.md,
      marginBottom: SPACE.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      ...SHADOW.sm,
    },
    pressed: { opacity: 0.92 },
    image: {
      width: 68,
      height: 68,
      borderRadius: RADIUS.md,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageFallback: { alignItems: "center", justifyContent: "center" },
    body: { flex: 1, minWidth: 0, gap: 5 },
    title: { color: colors.textPrimary, fontSize: 14.5, fontWeight: "700", lineHeight: 19 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    price: { color: colors.textPrimary, fontSize: 15.5, fontWeight: "800", letterSpacing: -0.2 },
    comparePrice: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "500",
      textDecorationLine: "line-through",
    },
    discount: { color: colors.success, fontSize: 11.5, fontWeight: "800" },
    chips: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 1 },
    stockChip: { flexDirection: "row", alignItems: "center", gap: 3 },
    stockText: { fontSize: 11.5, fontWeight: "700" },
  });
