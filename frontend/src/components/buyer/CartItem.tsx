/**
 * OmniQ mobile app - cart item row.
 * Author: OmniQ Team
 */
import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useThemeColors } from "@/store/useThemeStore";
import type { CartLine } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";

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
  return (
    <Card style={styles.card}>
      <Link href={`/product/${item.product.id}`} asChild>
        <Pressable style={styles.topRow}>
          {imageUrl ? (
            <View style={styles.imageContainer}>
              <Image source={imageUrl} style={styles.image} contentFit="contain" transition={150} />
            </View>
          ) : (
            <Text style={styles.placeholderImage}>📦</Text>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.product.title}</Text>
            <Text style={styles.meta}>{item.product.seller || 'OmniQ'}{item.size ? ` · Size ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""}</Text>
            <Text style={styles.price}>{formatCurrency(item.product.price)}</Text>
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
    prev.item.color === next.item.color
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
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4
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