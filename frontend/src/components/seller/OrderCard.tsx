/**
 * OmniQ mobile app - seller order card.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, Image } from "react-native";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { colors } from "@/constants/colors";
import { formatCurrency } from "@/utils/formatCurrency";

type OrderCardProps = {
  order: any; // using any for simplicity, handles Supabase structure
};

export function OrderCard({ order }: OrderCardProps) {
  // Extract info from order items
  const items = order.order_items || [];
  const firstItem = items[0];
  const product = firstItem?.product;
  const imageUrl = product?.images && product.images.length > 0 ? product.images[0] : null;
  const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  
  // Format items text
  let itemsText = `${totalQuantity} item${totalQuantity !== 1 ? 's' : ''}`;
  if (product?.title) {
    itemsText = product.title;
    if (totalQuantity > 1) {
      itemsText += ` (+${totalQuantity - 1} more)`;
    }
  }

  // Handle total (sometimes named differently based on API structure, but usually `total`)
  const amount = Number(order.total || order.total_amount || 0);

  return (
    <Card style={styles.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.placeholderIcon} />
      )}
      <View style={styles.info}>
        <Text style={styles.id}>Order {order.id.substring(0, 8).toUpperCase()}</Text>
        <Text style={styles.meta} numberOfLines={1}>{itemsText}</Text>
        <View style={{ alignSelf: 'flex-start', marginTop: 2 }}>
          <StatusBadge status={order.status} />
        </View>
      </View>
      <Text style={styles.amount}>{formatCurrency(amount)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    gap: 16
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.card2,
  },
  placeholderIcon: {
    width: 60,
    height: 60,
    backgroundColor: colors.card2,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    gap: 4,
    justifyContent: "center"
  },
  id: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "900"
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13
  },
  amount: {
    color: colors.goldLight,
    fontSize: 18,
    fontWeight: "900"
  }
});
