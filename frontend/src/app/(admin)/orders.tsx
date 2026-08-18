/**
 * OmniQ mobile app - admin order list.
 *
 * Two things changed the shape of this screen:
 *
 *  - The API now filters and pages in Postgres instead of returning every order on the platform.
 *    So the tab is a server-side filter, not a client-side `.filter()`, and this uses an infinite
 *    query - which also means the list no longer silently stopped at PostgREST's 1000-row cap.
 *  - Each card opens collapsed. A full order card is roughly 400px of addresses, line items and
 *    fee breakdown; ten of them is a wall of text to scroll past when the usual task is "find this
 *    order, mark it delivered". The summary answers that, and the detail is one tap away.
 *
 * Author: OmniQ Team
 */
// Explicit React import: this tsconfig uses the classic JSX transform, so a file rendering JSX
// without it resolves `React` to a UMD global and TypeScript reports TS2686 on every element.
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";
import { orderSubtotalOf, resolveOrderDeliveryFee } from "@/constants/delivery";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { RADIUS, SHADOW, SPACE, adminOrderStatusMeta, withAlpha } from "@/constants/adminTheme";
import {
  AdminHeader,
  EmptyState,
  QueryBoundary,
  SegmentedTabs,
  SkeletonRows,
  StatusPill,
  type SegmentItem
} from "@/components/admin/AdminUI";
import { ChevronDownIcon, ChevronRightIcon, ReceiptIcon } from "@/components/ui/SellerIcons";

type TabKey = "active" | "delivered" | "cancelled";

const PAGE_SIZE = 25;

const TABS: SegmentItem[] = [
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" }
];

export default function AdminOrdersScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  // Pull-to-refresh for this list. `Screen` owns it for scrolling screens; this one
  // passes scroll={false}, so the list attaches it itself.
  const refreshControl = useRefreshControl();
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ordersQuery = useInfiniteQuery({
    queryKey: ["adminOrders", activeTab],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.get("/admin/orders", {
        params: { status: activeTab, limit: PAGE_SIZE, offset: pageParam }
      });
      // Paging figures ride in `meta`; the page itself stays in `data`.
      return { rows: res.data?.data ?? [], meta: res.data?.meta ?? {} };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.meta?.hasMore) return undefined;
      return allPages.reduce((count, page) => count + (page?.rows?.length ?? 0), 0);
    }
  });

  const orders: any[] = useMemo(
    () => (ordersQuery.data?.pages ?? []).flatMap((page: any) => page.rows ?? []),
    [ordersQuery.data]
  );
  const total: number = ordersQuery.data?.pages?.[0]?.meta?.total ?? orders.length;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data } = await apiClient.patch(`/orders/${orderId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      // Every tab's cached pages are now wrong: the order moved between them.
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
    },
    // This mutation previously had no onError at all, so a failed status change looked exactly like
    // a successful one - the button stopped spinning and the order simply did not move.
    onError: (err: any) => {
      Alert.alert(
        "Couldn't update the order",
        err?.response?.data?.error?.message || err?.message || "The order was not changed. Please try again."
      );
    }
  });

  const handleMarkDelivered = useCallback(
    (orderId: string) => {
      Alert.alert("Mark as delivered?", "This closes the order and it moves to the Delivered tab.", [
        { text: "Cancel", style: "cancel" },
        { text: "Mark delivered", onPress: () => updateStatusMutation.mutate({ orderId, status: "delivered" }) }
      ]);
    },
    [updateStatusMutation]
  );

  const formatDate = useCallback(
    (value: string) =>
      value
        ? new Date(value).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "Unknown",
    []
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerBlock}>
        <AdminHeader
          title="Orders"
          subtitle={
            ordersQuery.isSuccess
              ? `Showing ${orders.length} of ${total} ${activeTab} order${total === 1 ? "" : "s"}`
              : "Every order across the platform"
          }
        />
        <SegmentedTabs
          items={TABS}
          value={activeTab}
          onChange={(key) => {
            setActiveTab(key as TabKey);
            setExpandedId(null);
          }}
        />
      </View>
    ),
    [styles, ordersQuery.isSuccess, orders.length, total, activeTab]
  );

  const renderItem = useCallback(
    ({ item: order }: { item: any }) => {
      const meta = adminOrderStatusMeta(order.status, colors);
      const isOpen = expandedId === order.id;
      const busy = updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order.id;

      const itemsSubtotal = orderSubtotalOf(order);
      const deliveryFee = resolveOrderDeliveryFee(itemsSubtotal, order.total);
      const orderTotal = itemsSubtotal + deliveryFee;
      const lineCount = order.order_items?.length ?? 0;

      // Sellers to collect from. An order can span more than one, so they are de-duplicated by id.
      const sellerMap: Record<string, { name: string; city: string }> = {};
      for (const item of order.order_items ?? []) {
        const seller = item.product?.seller;
        if (seller?.id && !sellerMap[seller.id]) {
          sellerMap[seller.id] = { name: seller.business_name, city: seller.city };
        }
      }
      if (Object.keys(sellerMap).length === 0 && order.seller) {
        sellerMap[order.seller_id] = { name: order.seller.business_name, city: order.seller.city };
      }
      const pickups = Object.values(sellerMap);

      // Delivery details come from the order's own snapshot, which is what the buyer confirmed at
      // checkout. `order.buyer` mirrors the `profiles` row: it can be blank, it can be stale, and it
      // never reflects a one-off address, so it is a fallback only - never the primary source.
      const deliveryAddress = order.delivery_address || {};
      const deliveryPhone = deliveryAddress.phone || order.buyer?.phone_number;
      // Built by filtering, so a missing line2 or state cannot leave a dangling ", " in the output.
      const deliveryLine = [
        deliveryAddress.street || deliveryAddress.line1,
        deliveryAddress.line2,
        deliveryAddress.city,
        deliveryAddress.state
      ]
        .filter(Boolean)
        .join(", ");
      const deliveryPincode = deliveryAddress.zip || deliveryAddress.pincode;

      return (
        <View style={styles.card}>
          {/* SUMMARY - always visible, and the whole row toggles the detail */}
          <Pressable
            onPress={() => setExpandedId(isOpen ? null : order.id)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            accessibilityLabel={`Order ${order.id.substring(0, 8)}, ${meta.label}, ${formatCurrency(orderTotal)}`}
            style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
          >
            <View style={styles.summaryTop}>
              <Text style={styles.orderId} selectable>
                #{order.id.substring(0, 8).toUpperCase()}
              </Text>
              <StatusPill label={meta.label} color={meta.color} tint={meta.tint} />
            </View>

            <View style={styles.summaryBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.buyerName} numberOfLines={1}>
                  {order.buyer?.full_name || "Buyer removed"}
                </Text>
                <Text style={styles.summaryMeta} numberOfLines={1}>
                  {formatDate(order.created_at)} · {lineCount} item{lineCount === 1 ? "" : "s"}
                </Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.orderTotal}>{formatCurrency(orderTotal)}</Text>
                <View style={styles.expandHint}>
                  <Text style={styles.expandHintText}>{isOpen ? "Hide" : "Details"}</Text>
                  {isOpen ? (
                    <ChevronDownIcon size={13} color={colors.textMuted} strokeWidth={2.4} />
                  ) : (
                    <ChevronRightIcon size={13} color={colors.textMuted} strokeWidth={2.4} />
                  )}
                </View>
              </View>
            </View>
          </Pressable>

          {/* DETAIL - mounted only while open, so a long list stays cheap to scroll */}
          {isOpen ? (
            <View style={styles.detail}>
              <View style={styles.moneyBlock}>
                <MoneyRow label="Items" value={formatCurrency(itemsSubtotal)} styles={styles} />
                <MoneyRow
                  label="Delivery"
                  value={deliveryFee > 0 ? formatCurrency(deliveryFee) : "Free"}
                  styles={styles}
                />
                <MoneyRow label="Platform fee" value={formatCurrency(order.platform_fee)} styles={styles} />
                <MoneyRow
                  label="Buyer paid"
                  value={formatCurrency(orderTotal)}
                  emphasis
                  styles={styles}
                />
                <MoneyRow
                  label="Payment"
                  value={String(order.payment_method ?? "cod").toUpperCase()}
                  styles={styles}
                />
              </View>

              {pickups.map((seller: any, index: number) => (
                <View key={index} style={styles.legBlock}>
                  <View style={styles.legLabelRow}>
                    <View style={[styles.legDot, { backgroundColor: colors.accent }]} />
                    <Text style={styles.legLabel}>
                      {pickups.length > 1 ? `PICKUP ${index + 1} OF ${pickups.length}` : "PICKUP FROM"}
                    </Text>
                  </View>
                  <Text style={styles.legName}>{seller.name || "Unknown store"}</Text>
                  <Text style={styles.legDetail}>{seller.city || "City not set"}</Text>
                </View>
              ))}

              <View style={styles.legBlock}>
                <View style={styles.legLabelRow}>
                  <View style={[styles.legDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.legLabel}>DELIVER TO</Text>
                </View>
                <Text style={styles.legName}>{order.buyer?.full_name || "Buyer removed"}</Text>
                {deliveryPhone ? <Text style={styles.legDetail} selectable>{deliveryPhone}</Text> : null}
                {deliveryLine ? (
                  <Text style={styles.legDetail}>
                    {deliveryLine}
                    {deliveryPincode ? ` — ${deliveryPincode}` : ""}
                  </Text>
                ) : null}
              </View>

              {lineCount > 0 ? (
                <View style={styles.itemsBlock}>
                  <Text style={styles.itemsTitle}>ITEMS</Text>
                  {order.order_items.map((item: any, index: number) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.quantity}× {item.product?.title || "Product removed"}
                      </Text>
                      <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {order.status !== "delivered" && order.status !== "cancelled" ? (
            <Pressable
              onPress={() => handleMarkDelivered(order.id)}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.deliverBtn, pressed && styles.pressed, busy && styles.btnBusy]}
            >
              <Text style={styles.deliverBtnText}>{busy ? "Updating…" : "Mark delivered"}</Text>
            </Pressable>
          ) : null}
        </View>
      );
    },
    [colors, styles, expandedId, updateStatusMutation, handleMarkDelivered, formatDate]
  );

  return (
    <Screen scroll={false}>
      <QueryBoundary
        isLoading={ordersQuery.isLoading}
        error={ordersQuery.error}
        onRetry={ordersQuery.refetch}
        skeleton={
          <>
            {renderHeader()}
            <SkeletonRows count={5} />
          </>
        }
      >
        <FlashList
          data={orders}
          refreshControl={refreshControl}
          renderItem={renderItem}
          keyExtractor={(item: any) => String(item.id)}
          {...({ estimatedItemSize: 150 } as any)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACE.md }} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (ordersQuery.hasNextPage && !ordersQuery.isFetchingNextPage) ordersQuery.fetchNextPage();
          }}
          ListFooterComponent={
            ordersQuery.isFetchingNextPage ? (
              <Text style={styles.footerNote}>Loading more orders…</Text>
            ) : orders.length > 0 && !ordersQuery.hasNextPage ? (
              <Text style={styles.footerNote}>That's all {total} of them.</Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={ReceiptIcon}
              title={
                activeTab === "active"
                  ? "No orders in flight"
                  : activeTab === "delivered"
                    ? "Nothing delivered yet"
                    : "No cancelled orders"
              }
              message={
                activeTab === "active"
                  ? "Orders appear here from the moment a buyer checks out until they're delivered."
                  : activeTab === "delivered"
                    ? "Completed orders are kept here for your records."
                    : "Cancelled orders are excluded from GMV."
              }
            />
          }
        />
      </QueryBoundary>
    </Screen>
  );
}

function MoneyRow({
  label,
  value,
  emphasis,
  styles
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  styles: any;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.moneyLabel, emphasis && styles.moneyLabelStrong]}>{label}</Text>
      <Text style={[styles.moneyValue, emphasis && styles.moneyValueStrong]}>{value}</Text>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    headerBlock: { paddingBottom: SPACE.lg },
    pressed: { opacity: 0.85 },
    btnBusy: { opacity: 0.6 },

    card: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: "hidden",
      ...SHADOW.sm
    },
    summary: { padding: SPACE.lg },
    summaryTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACE.md
    },
    orderId: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.6,
      fontVariant: ["tabular-nums"]
    },
    summaryBottom: { flexDirection: "row", alignItems: "flex-end", gap: SPACE.md, marginTop: SPACE.md },
    buyerName: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
    summaryMeta: { color: colors.textMuted, fontSize: 11.5, fontWeight: "600", marginTop: 3 },
    summaryRight: { alignItems: "flex-end" },
    orderTotal: { color: colors.textPrimary, fontSize: 17, fontWeight: "900", letterSpacing: -0.4 },
    expandHint: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
    expandHintText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },

    detail: {
      paddingHorizontal: SPACE.lg,
      paddingBottom: SPACE.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: SPACE.lg,
      gap: SPACE.lg
    },
    moneyBlock: { gap: 7 },
    moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    moneyLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
    moneyLabelStrong: { color: colors.textPrimary, fontWeight: "800" },
    moneyValue: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
    moneyValueStrong: { color: colors.textPrimary, fontSize: 15, fontWeight: "900" },

    legBlock: { gap: 3 },
    legLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
    legDot: { width: 7, height: 7, borderRadius: 4 },
    legLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
    legName: { color: colors.textPrimary, fontSize: 14.5, fontWeight: "700" },
    legDetail: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },

    itemsBlock: {
      backgroundColor: colors.bgTertiary,
      borderRadius: RADIUS.sm,
      padding: SPACE.md,
      gap: 7
    },
    itemsTitle: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
    itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: SPACE.md },
    itemName: { color: colors.textPrimary, fontSize: 13, flex: 1, lineHeight: 18 },
    itemPrice: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },

    deliverBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 13,
      alignItems: "center",
      justifyContent: "center"
    },
    deliverBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13.5 },

    footerNote: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      paddingVertical: SPACE.xl
    }
  });
