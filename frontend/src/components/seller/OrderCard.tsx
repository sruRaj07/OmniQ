/**
 * OmniQ mobile app - seller order card.
 * Author: OmniQ Team
 */
import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { NetworkAwareImage } from "@/components/shared/NetworkAwareImage";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useThemeColors } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { orderTotalOf } from "@/constants/delivery";

type OrderCardProps = {
  order: any;
  isSeller?: boolean;
  onPress?: () => void;
};

export const OrderCard = memo(function OrderCard({ order, isSeller, onPress }: OrderCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

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

  const amount = orderTotalOf(order);

  const cardContent = (
    <Card style={styles.card}>
      {imageUrl ? (
        <NetworkAwareImage
          source={imageUrl}
          thumbnailSource={product?.thumbnail_url}
          placeholder={product?.blurhash}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
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
      <View style={styles.rightContent}>
        <Text style={styles.amount}>{formatCurrency(amount)}</Text>
      </View>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}, (prev, next) => {
  return (
    prev.order.id === next.order.id &&
    prev.order.status === next.order.status &&
    prev.order.total === next.order.total &&
    prev.order.total_amount === next.order.total_amount &&
    // The displayed amount is derived from the subtotal too, so it must take part in the compare.
    prev.order.subtotal === next.order.subtotal &&
    prev.isSeller === next.isSeller
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.card2
  },
  placeholderIcon: {
    width: 60,
    height: 60,
    backgroundColor: colors.card2,
    borderRadius: 8
  },
  info: {
    flex: 1,
    gap: 4,
    justifyContent: "center"
  },
  id: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  }
});