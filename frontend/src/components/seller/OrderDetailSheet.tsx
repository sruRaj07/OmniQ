/**
 * OmniQ mobile app - seller order detail sheet.
 *
 * A bottom sheet rather than a route: the seller is working through a list and needs to
 * drop back into it, so the list stays mounted behind the sheet and scroll position is
 * never lost.
 *
 * Author: OmniQ Team
 */
import React, { memo, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NetworkAwareImage } from "@/components/shared/NetworkAwareImage";
import { StatusPill } from "@/components/seller/SellerUI";
import { useThemeColors } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { fullDateTime } from "@/utils/relativeTime";
import { orderSubtotalOf, resolveOrderDeliveryFee } from "@/constants/delivery";
import {
  ORDER_FLOW,
  RADIUS,
  SHADOW,
  SPACE,
  nextOrderStep,
  orderStatusMeta,
  withAlpha,
} from "@/constants/sellerTheme";
import {
  AlertIcon,
  CheckIcon,
  ImageIcon,
  MapPinIcon,
  PhoneIcon,
  XIcon,
} from "@/components/ui/SellerIcons";

const STEP_LABELS: Record<string, string> = {
  pending: "Placed",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
};

type OrderDetailSheetProps = {
  order: any | null;
  onClose: () => void;
  onAdvance: (orderId: string, status: string) => void;
  isAdvancing: boolean;
};

/** Four-dot progress rail. Cancelled orders never reach it — they get a banner instead. */
const ProgressRail = memo(function ProgressRail({ status, colors }: { status: string; colors: any }) {
  const styles = useMemo(() => getRailStyles(colors), [colors]);
  const currentIndex = Math.max(ORDER_FLOW.indexOf(String(status).toLowerCase() as any), 0);

  return (
    <View style={styles.rail}>
      {ORDER_FLOW.map((step, index) => {
        const done = index <= currentIndex;
        const isLast = index === ORDER_FLOW.length - 1;
        return (
          <View key={step} style={styles.stepWrap}>
            <View style={styles.dotRow}>
              <View style={[styles.dot, done && styles.dotDone]}>
                {done ? <CheckIcon size={11} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              {!isLast ? <View style={[styles.connector, index < currentIndex && styles.connectorDone]} /> : null}
            </View>
            <Text style={[styles.stepLabel, done && styles.stepLabelDone]} numberOfLines={1}>
              {STEP_LABELS[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

const getRailStyles = (colors: any) =>
  StyleSheet.create({
    rail: { flexDirection: "row", marginTop: SPACE.lg },
    stepWrap: { flex: 1 },
    dotRow: { flexDirection: "row", alignItems: "center" },
    dot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border2,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    dotDone: { backgroundColor: colors.success, borderColor: colors.success },
    connector: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
    connectorDone: { backgroundColor: colors.success },
    stepLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 6 },
    stepLabelDone: { color: colors.textPrimary, fontWeight: "700" },
  });

export const OrderDetailSheet = memo(function OrderDetailSheet({
  order,
  onClose,
  onAdvance,
  isAdvancing,
}: OrderDetailSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Both helpers fall through to 0 on a null order, so the maths is safe while the sheet
  // animates out and `order` has already been cleared.
  const subtotal = orderSubtotalOf(order);
  const deliveryFee = resolveOrderDeliveryFee(subtotal, order?.total ?? order?.total_amount);
  const status = orderStatusMeta(order?.status, colors);
  const step = nextOrderStep(order?.status);
  const isCancelled = String(order?.status).toLowerCase() === "cancelled";

  const handleAdvance = useCallback(() => {
    if (order && step) onAdvance(order.id, step.status);
  }, [onAdvance, order, step]);

  const address = order?.delivery_address || {};
  const addressLine = [address.street || address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
  const phone = address.phone || order?.buyer?.phone_number;

  return (
    <Modal visible={!!order} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close order details" />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.orderId}>#{String(order?.id ?? "").substring(0, 8).toUpperCase()}</Text>
              <Text style={styles.placedAt}>Placed {fullDateTime(order?.created_at)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
              <XIcon size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statusRow}>
              <StatusPill label={status.label} color={status.color} tint={status.tint} size="md" />
              <Text style={styles.statusHint}>{status.hint}</Text>
            </View>

            {isCancelled ? (
              <View style={styles.cancelBanner}>
                <AlertIcon size={16} color={colors.danger} strokeWidth={2.2} />
                <Text style={styles.cancelText}>This order was cancelled and needs no action.</Text>
              </View>
            ) : (
              <ProgressRail status={order?.status} colors={colors} />
            )}

            {addressLine || phone ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Delivery to</Text>
                {addressLine ? (
                  <View style={styles.blockRow}>
                    <MapPinIcon size={15} color={colors.textMuted} strokeWidth={2} />
                    <Text style={styles.blockValue}>{addressLine}</Text>
                  </View>
                ) : null}
                {phone ? (
                  <View style={styles.blockRow}>
                    <PhoneIcon size={15} color={colors.textMuted} strokeWidth={2} />
                    <Text style={styles.blockValue}>{phone}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Items to pack</Text>
              {(order?.order_items || []).map((item: any) => {
                const product = item.product;
                const lineTotal = (Number(item.price) || Number(product?.price) || 0) * (item.quantity || 1);
                return (
                  <View key={item.id} style={styles.itemRow}>
                    {product?.images?.[0] ? (
                      <NetworkAwareImage
                        source={product.images[0]}
                        thumbnailSource={product.thumbnail_url}
                        placeholder={product.blurhash}
                        style={styles.itemImage}
                        displayWidth={44}
                        contentFit="cover"
                        transition={120}
                      />
                    ) : (
                      <View style={[styles.itemImage, styles.itemImageFallback]}>
                        <ImageIcon size={16} color={colors.textMuted} strokeWidth={1.8} />
                      </View>
                    )}
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {product?.title || "Unknown item"}
                      </Text>
                      <Text style={styles.itemQty}>Qty {item.quantity || 1}</Text>
                    </View>
                    <Text style={styles.itemPrice}>{formatCurrency(lineTotal)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.bill}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item total</Text>
                <Text style={styles.billValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery</Text>
                <Text style={[styles.billValue, deliveryFee === 0 && styles.billFree]}>
                  {deliveryFee > 0 ? formatCurrency(deliveryFee) : "FREE"}
                </Text>
              </View>
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotalLabel}>Buyer paid</Text>
                <Text style={styles.billTotalValue}>{formatCurrency(subtotal + deliveryFee)}</Text>
              </View>
            </View>
          </ScrollView>

          {step ? (
            <View style={styles.footer}>
              <Pressable
                onPress={handleAdvance}
                disabled={isAdvancing}
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryPressed, isAdvancing && styles.primaryBusy]}
              >
                {isAdvancing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryLabel}>{step.label}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
});

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(20,19,17,0.45)",
    },
    sheet: {
      backgroundColor: colors.bgPrimary,
      borderTopLeftRadius: RADIUS.xxl,
      borderTopRightRadius: RADIUS.xxl,
      maxHeight: "92%",
      paddingTop: SPACE.sm,
      width: "100%",
      maxWidth: 500,
      alignSelf: "center",
      ...SHADOW.lg,
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border2,
      alignSelf: "center",
      marginBottom: SPACE.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: SPACE.xl,
      paddingBottom: SPACE.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerText: { flex: 1 },
    orderId: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", letterSpacing: 0.2 },
    placedAt: { color: colors.textMuted, fontSize: 12.5, fontWeight: "500", marginTop: 2 },
    close: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.md,
      backgroundColor: colors.bgTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    closePressed: { opacity: 0.7 },
    scroll: { flexGrow: 0 },
    scrollContent: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg, paddingBottom: SPACE.xl },
    statusRow: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
    statusHint: { flex: 1, color: colors.textSecondary, fontSize: 12.5, fontWeight: "500" },
    cancelBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.sm,
      marginTop: SPACE.lg,
      padding: SPACE.md,
      borderRadius: RADIUS.md,
      backgroundColor: withAlpha(colors.danger, 0.08),
    },
    cancelText: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: "600" },
    block: {
      marginTop: SPACE.xl,
      padding: SPACE.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    blockTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: SPACE.md,
    },
    blockRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.sm, marginBottom: 6 },
    blockValue: { flex: 1, color: colors.textPrimary, fontSize: 13.5, fontWeight: "500", lineHeight: 20 },
    itemRow: { flexDirection: "row", alignItems: "center", gap: SPACE.md, paddingVertical: SPACE.sm },
    itemImage: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: colors.bgTertiary },
    itemImageFallback: { alignItems: "center", justifyContent: "center" },
    itemBody: { flex: 1, minWidth: 0 },
    itemName: { color: colors.textPrimary, fontSize: 13.5, fontWeight: "600", lineHeight: 18 },
    itemQty: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 2 },
    itemPrice: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
    bill: {
      marginTop: SPACE.xl,
      padding: SPACE.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: colors.bgSecondary,
    },
    billRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 },
    billLabel: { color: colors.textSecondary, fontSize: 13.5 },
    billValue: { color: colors.textPrimary, fontSize: 13.5, fontWeight: "600" },
    billFree: { color: colors.success, fontWeight: "800" },
    billDivider: { height: 1, backgroundColor: colors.border, marginVertical: SPACE.sm },
    billTotalLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    billTotalValue: { color: colors.textPrimary, fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
    footer: {
      paddingHorizontal: SPACE.xl,
      paddingTop: SPACE.md,
      paddingBottom: SPACE.xxl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.bgPrimary,
    },
    primaryAction: {
      minHeight: 50,
      borderRadius: RADIUS.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOW.sm,
    },
    primaryPressed: { opacity: 0.88 },
    primaryBusy: { opacity: 0.7 },
    primaryLabel: { color: "#FFFFFF", fontSize: 15.5, fontWeight: "800", letterSpacing: 0.2 },
  });
