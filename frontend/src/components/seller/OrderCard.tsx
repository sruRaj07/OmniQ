/**
 * OmniQ mobile app - seller order card.
 *
 * The card answers three questions without a tap: what is it, how much, and what do I do
 * next. The "what do I do next" button is inline, because making a seller open a sheet to
 * mark an order packed is the difference between clearing ten orders and clearing three.
 *
 * Author: OmniQ Team
 */
import React, { memo, useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { NetworkAwareImage } from "@/components/shared/NetworkAwareImage";
import { StatusPill } from "@/components/seller/SellerUI";
import { useThemeColors } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { shortRelativeTime } from "@/utils/relativeTime";
import { orderTotalOf } from "@/constants/delivery";
import { RADIUS, SHADOW, SPACE, nextOrderStep, orderStatusMeta } from "@/constants/sellerTheme";
import { ImageIcon } from "@/components/ui/SellerIcons";

type OrderCardProps = {
  order: any;
  onPress?: () => void;
  /** Supplied on the orders screen; the dashboard preview leaves it out and stays read-only. */
  onAdvance?: (orderId: string, status: string) => void;
  isAdvancing?: boolean;
};

export const OrderCard = memo(
  function OrderCard({ order, onPress, onAdvance, isAdvancing }: OrderCardProps) {
    const colors = useThemeColors();
    const styles = useMemo(() => getStyles(colors), [colors]);

    const items = order.order_items || [];
    const firstItem = items[0];
    const product = firstItem?.product;
    const imageUrl = product?.images?.[0] || null;
    const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

    const status = orderStatusMeta(order.status, colors);
    const step = nextOrderStep(order.status);
    const amount = orderTotalOf(order);

    const summary = product?.title
      ? totalQuantity > 1
        ? `${product.title} +${totalQuantity - 1} more`
        : product.title
      : `${totalQuantity} item${totalQuantity !== 1 ? "s" : ""}`;

    const handleAdvance = useCallback(() => {
      if (step && onAdvance) onAdvance(order.id, step.status);
    }, [onAdvance, order.id, step]);

    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
      >
        <View style={styles.main}>
          {imageUrl ? (
            <NetworkAwareImage
              source={imageUrl}
              thumbnailSource={product?.thumbnail_url}
              placeholder={product?.blurhash}
              style={styles.image}
              displayWidth={56}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <ImageIcon size={18} color={colors.textMuted} strokeWidth={1.8} />
            </View>
          )}

          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text style={styles.id} numberOfLines={1}>
                #{String(order.id).substring(0, 8).toUpperCase()}
              </Text>
              <Text style={styles.time}>{shortRelativeTime(order.created_at)}</Text>
            </View>
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
            <View style={styles.metaRow}>
              <StatusPill label={status.label} color={status.color} tint={status.tint} />
              <Text style={styles.quantity}>
                {totalQuantity} item{totalQuantity !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          <Text style={styles.amount}>{formatCurrency(amount)}</Text>
        </View>

        {step && onAdvance ? (
          <Pressable
            onPress={handleAdvance}
            disabled={isAdvancing}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed, isAdvancing && styles.actionBusy]}
          >
            {isAdvancing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.actionLabel}>{step.label}</Text>
            )}
          </Pressable>
        ) : null}
      </Pressable>
    );
  },
  // ⚡ PERFORMANCE: order objects are rebuilt by React Query on every refetch, so an
  // identity compare would re-render the whole list every 3 minutes. Compare the fields
  // the card actually draws instead.
  (prev, next) =>
    prev.order.id === next.order.id &&
    prev.order.status === next.order.status &&
    prev.order.total === next.order.total &&
    prev.order.total_amount === next.order.total_amount &&
    prev.order.subtotal === next.order.subtotal &&
    prev.order.created_at === next.order.created_at &&
    prev.isAdvancing === next.isAdvancing &&
    prev.onPress === next.onPress &&
    prev.onAdvance === next.onAdvance
);

const getStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACE.md,
      marginBottom: SPACE.md,
      ...SHADOW.sm,
    },
    pressed: { opacity: 0.92 },
    main: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
    image: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.md,
      backgroundColor: colors.bgTertiary,
    },
    imageFallback: { alignItems: "center", justifyContent: "center" },
    info: { flex: 1, minWidth: 0, gap: 3 },
    topRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
    id: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
    time: { color: colors.textMuted, fontSize: 11.5, fontWeight: "600" },
    summary: { color: colors.textSecondary, fontSize: 13 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, marginTop: 3 },
    quantity: { color: colors.textMuted, fontSize: 11.5, fontWeight: "600" },
    amount: { color: colors.textPrimary, fontSize: 16.5, fontWeight: "800", letterSpacing: -0.3 },
    action: {
      marginTop: SPACE.md,
      paddingVertical: 10,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgTertiary,
      minHeight: 40,
    },
    actionPressed: { opacity: 0.75 },
    actionBusy: { opacity: 0.7 },
    actionLabel: { color: colors.textPrimary, fontSize: 13.5, fontWeight: "800" },
  });
