/**
 * OmniQ mobile app - cart item row.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, Image } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import type { CartLine } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";

type CartItemProps = {
  item: CartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CartItem({ item, onIncrement, onDecrement, onRemove }: CartItemProps) {
  const imageUrl = item.product.images && item.product.images.length > 0 ? item.product.images[0] : null;

  return (
    <Card style={styles.card}>
      {imageUrl ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        </View>
      ) : (
        <Text style={styles.placeholderImage}>📦</Text>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.product.title}</Text>
        <Text style={styles.meta}>{item.product.seller || 'OmniQ'}{item.size ? ` · Size ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""}</Text>
        <Text style={styles.price}>{formatCurrency(item.product.price)}</Text>
      </View>
      <View style={styles.qty}>
        <Button variant="secondary" style={styles.qtyButton} onPress={onDecrement}>−</Button>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <Button variant="secondary" style={styles.qtyButton} onPress={onIncrement}>+</Button>
      </View>
      <Text onPress={onRemove} style={styles.remove}>🗑</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginBottom: 16,
    gap: 14
  },
  imageContainer: {
    width: 82,
    height: 82,
    borderRadius: 14,
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
    borderRadius: 14,
    backgroundColor: colors.card2,
    textAlign: "center",
    lineHeight: 82,
    fontSize: 38
  },
  info: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 17
  },
  meta: {
    color: colors.textMuted,
    marginTop: 4
  },
  price: {
    color: colors.goldLight,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 10
  },
  qty: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgTertiary,
    borderRadius: 14,
    padding: 4,
    gap: 8
  },
  qtyButton: {
    minHeight: 34,
    width: 34,
    paddingHorizontal: 0
  },
  qtyText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    minWidth: 18,
    textAlign: "center"
  },
  remove: {
    fontSize: 20,
    color: colors.textSecondary
  }
});
