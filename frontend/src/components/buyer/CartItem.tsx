/**
 * OmniQ mobile app - cart item row.
 * Author: OmniQ Team
 */
import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Link } from "expo-router";
import { NetworkAwareImage } from "@/components/shared/NetworkAwareImage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useThemeColors } from "@/store/useThemeStore";
import type { CartLine } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { calculateTieredPrice } from "@/utils/tieredPricing";

type CartItemProps = {
  item: CartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export const CartItem = memo(function CartItem({
  item,
  onIncrement,
  onDecrement,
  onRemove
}: CartItemProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const imageUrl = item.product.images && item.product.images.length > 0 ? item.product.images[0] : null;

  const pricing = useMemo(() => calculateTieredPrice({
    quantity: item.quantity,
    price: item.product.price,
    offerPrice: item.product.offer_price,
    offerLimitQty: item.product.offer_limit_qty,
    unit: item.product.unit
  }), [item.quantity, item.product.price, item.product.offer_price, item.product.offer_limit_qty, item.product.unit]);

  return (
    <Card style={styles.card}>
      <Link href={`/product/${item.product.id}`} asChild>
        <Pressable style={styles.topRow}>
          {imageUrl ? (
            <View style={styles.imageContainer}>
              <NetworkAwareImage
                source={imageUrl}
                thumbnailSource={item.product.thumbnail_url}
                placeholder={item.product.blurhash}
                style={styles.image}
                displayWidth={82}
                contentFit="contain"
                transition={150}
              />
            </View>
          ) : (
            <Text style={styles.placeholderImage}>📦</Text>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.product.title}</Text>
            <Text style={styles.meta}>
              {item.product.seller || 'OmniQ'}
              {item.size ? ` · Size ${item.size}` : ""}
              {item.color ? ` · ${item.color}` : ""}
            </Text>

            {pricing.hasActiveOffer ? (
              <View style={styles.offerContainer}>
                <View style={styles.offerPriceRow}>
                  <Text style={styles.price}>{formatCurrency(pricing.totalPrice)}</Text>
                  <Text style={styles.standardStrikePrice}>{formatCurrency(pricing.standardTotalPrice)}</Text>
                </View>

                <View style={styles.offerBreakdownBox}>
                  <Text style={styles.offerBreakdownText}>
                    {pricing.regularQty > 0
                      ? `${pricing.offerQty} ${pricing.unit} @ ₹${pricing.offerPrice} + ${pricing.regularQty} ${pricing.unit} @ ₹${pricing.regularPrice}`
                      : `${pricing.offerQty} ${pricing.unit} @ ₹${pricing.offerPrice}/${pricing.unit} (Offer applied)`}
                  </Text>
                </View>

                {pricing.totalSavings > 0 ? (
                  <View style={styles.savingsPill}>
                    <Text style={styles.savingsPillText}>Saved {formatCurrency(pricing.totalSavings)}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.price}>{formatCurrency(item.product.price * item.quantity)}</Text>
            )}
          </View>
        </Pressable>
      </Link>
      <View style={styles.bottomRow}>
        <View style={styles.qty}>
          <Button variant="secondary" style={styles.qtyButton} onPress={onDecrement}>−</Button>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <Button variant="secondary" style={styles.qtyButton} onPress={onIncrement}>+</Button>
        </View>
        <Text onPress={onRemove} style={styles.remove}>Delete</Text>
      </View>
    </Card>
  );
}, (prev, next) => {
  return (
    prev.item.product.id === next.item.product.id &&
    prev.item.quantity === next.item.quantity &&
    prev.item.size === next.item.size &&
    prev.item.color === next.item.color &&
    prev.item.product.price === next.item.product.price &&
    prev.item.product.offer_price === next.item.product.offer_price &&
    prev.item.product.offer_limit_qty === next.item.product.offer_limit_qty
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
    gap: 16
  },
  topRow: {
    flexDirection: "row",
    gap: 16,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 4,
  },
  imageContainer: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: colors.card2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 4
  },
  image: {
    width: "100%",
    height: "100%"
  },
  placeholderImage: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: colors.card2,
    textAlign: "center",
    lineHeight: 82,
    fontSize: 28
  },
  info: {
    flex: 1,
    gap: 4
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 22
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13
  },
  price: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700"
  },
  offerContainer: {
    gap: 4,
    marginTop: 4
  },
  offerPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8
  },
  standardStrikePrice: {
    fontSize: 14,
    color: colors.textMuted || colors.textSecondary,
    textDecorationLine: "line-through",
    fontWeight: "500"
  },
  offerBreakdownBox: {
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.25)"
  },
  offerBreakdownText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A"
  },
  savingsPill: {
    backgroundColor: "rgba(234, 88, 12, 0.12)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: "flex-start"
  },
  savingsPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EA580C"
  },
  qty: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgTertiary,
    borderRadius: 8,
    padding: 4,
    gap: 8
  },
  qtyButton: {
    minHeight: 34,
    width: 34,
    paddingHorizontal: 0,
    borderRadius: 6
  },
  qtyText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center"
  },
  remove: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "700",
    textDecorationLine: "underline"
  }
});