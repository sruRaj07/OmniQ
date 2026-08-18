/**
 * OmniQ mobile app - seller incoming orders.
 *
 * The old screen could show an order but not act on one: a seller had to pack goods with no
 * way to tell the buyer it had happened. Every row now carries the next step in the
 * lifecycle, and the tabs are organised by what needs doing rather than by age.
 *
 * Author: OmniQ Team
 */
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { OrderCard } from "@/components/seller/OrderCard";
import { OrderDetailSheet } from "@/components/seller/OrderDetailSheet";
import { SELLER_NAV_ITEMS } from "@/components/seller/sellerNav";
import { SellerToast, type ToastPayload } from "@/components/seller/SellerToast";
import { EmptyState, SegmentedTabs, SkeletonRows, type SegmentItem } from "@/components/seller/SellerUI";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { useOrders } from "@/hooks/useOrders";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { RADIUS, SPACE } from "@/constants/sellerTheme";
import { CheckCircleIcon, InboxIcon, SearchIcon, XIcon } from "@/components/ui/SellerIcons";

type OrderTab = "action" | "progress" | "done";

const TAB_OF_STATUS: Record<string, OrderTab> = {
  pending: "action",
  packed: "progress",
  dispatched: "progress",
  delivered: "done",
  cancelled: "done",
};

/**
 * Module scope keeps the component type stable, so typing in the search box updates the
 * value rather than remounting the header and stealing focus.
 */
const OrdersHeader = React.memo(function OrdersHeader({
  query,
  onQueryChange,
  tab,
  onTabChange,
  segments,
  actionCount,
  colors,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  tab: OrderTab;
  onTabChange: (key: string) => void;
  segments: SegmentItem[];
  actionCount: number;
  colors: any;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Orders</Text>
      <Text style={styles.subtitle}>
        {actionCount > 0
          ? `${actionCount} order${actionCount === 1 ? "" : "s"} waiting to be packed`
          : "Everything is packed and moving"}
      </Text>

      <View style={styles.searchBox}>
        <SearchIcon size={17} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search by order ID or product"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onQueryChange("")} hitSlop={8} accessibilityLabel="Clear search">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filters}>
        <SegmentedTabs items={segments} value={tab} onChange={onTabChange} />
      </View>
    </View>
  );
});

export default function SellerOrdersScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const refreshControl = useRefreshControl();
  const { sellerOrders, isLoading, updateOrderStatus, isUpdatingStatus } = useOrders();

  const [tab, setTab] = useState<OrderTab>("action");
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastPayload>(null);

  // ⚡ PERFORMANCE: one pass over the orders produces both the tab counts and the visible
  // slice. The previous screen ran four separate .filter() sweeps on every render.
  const { counts, visible } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const tally = { action: 0, progress: 0, done: 0 };
    const rows: any[] = [];

    for (const order of sellerOrders as any[]) {
      const bucket = TAB_OF_STATUS[String(order.status ?? "pending").toLowerCase()] ?? "action";
      tally[bucket] += 1;
      if (bucket !== tab) continue;
      if (needle) {
        const idMatch = String(order.id ?? "").toLowerCase().includes(needle);
        const productMatch = (order.order_items ?? []).some((item: any) =>
          String(item?.product?.title ?? "").toLowerCase().includes(needle)
        );
        if (!idMatch && !productMatch) continue;
      }
      rows.push(order);
    }

    return { counts: tally, visible: rows };
  }, [query, sellerOrders, tab]);

  const segments = useMemo<SegmentItem[]>(
    () => [
      { key: "action", label: "Needs packing", count: counts.action },
      { key: "progress", label: "On the way", count: counts.progress },
      { key: "done", label: "Completed", count: counts.done },
    ],
    [counts]
  );

  // The sheet reads from the live list rather than holding a snapshot, so advancing an order
  // from inside the sheet repaints the progress rail instead of showing a stale status.
  const selectedOrder = useMemo(
    () => (selectedOrderId ? (sellerOrders as any[]).find((order) => order.id === selectedOrderId) ?? null : null),
    [selectedOrderId, sellerOrders]
  );

  const handleAdvance = useCallback(
    (orderId: string, status: string) => {
      setAdvancingId(orderId);
      updateOrderStatus(
        { orderId, status },
        {
          onSuccess: () => {
            setAdvancingId(null);
            setToast({
              message:
                status === "packed"
                  ? "Marked as packed. Buyer notified."
                  : status === "dispatched"
                    ? "Handed to delivery."
                    : "Marked as delivered.",
              tone: "success",
            });
          },
          onError: (error: any) => {
            setAdvancingId(null);
            setToast({
              message: error?.response?.data?.error?.message || "Could not update the order. Try again.",
              tone: "error",
            });
          },
        }
      );
    },
    [updateOrderStatus]
  );

  const openOrder = useCallback((orderId: string) => setSelectedOrderId(orderId), []);
  const closeOrder = useCallback(() => setSelectedOrderId(null), []);
  const hideToast = useCallback(() => setToast(null), []);
  const handleTabChange = useCallback((key: string) => setTab(key as OrderTab), []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <OrderCard
        order={item}
        onPress={() => openOrder(item.id)}
        onAdvance={handleAdvance}
        isAdvancing={isUpdatingStatus && advancingId === item.id}
      />
    ),
    [advancingId, handleAdvance, isUpdatingStatus, openOrder]
  );

  const keyExtractor = useCallback((item: any) => String(item.id), []);

  const header = (
    <OrdersHeader
      query={query}
      onQueryChange={setQuery}
      tab={tab}
      onTabChange={handleTabChange}
      segments={segments}
      actionCount={counts.action}
      colors={colors}
    />
  );

  const emptyCopy: Record<OrderTab, { title: string; message: string }> = {
    action: { title: "Nothing to pack", message: "New orders land here the moment a buyer checks out." },
    progress: { title: "Nothing in transit", message: "Orders you have packed or dispatched show up here." },
    done: { title: "No completed orders yet", message: "Delivered and cancelled orders are archived here." },
  };

  return (
    <Screen scroll={false} bottomNavItems={SELLER_NAV_ITEMS}>
      {isLoading ? (
        <>
          {header}
          <SkeletonRows count={4} />
        </>
      ) : (
        <FlashList
          data={visible}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={refreshControl}
          ListHeaderComponent={header}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          {...({ estimatedItemSize: 150 } as any)}
          ListEmptyComponent={
            query.trim() ? (
              <EmptyState icon={SearchIcon} title="No matching orders" message="Check the order ID or try another product name." compact />
            ) : (
              <EmptyState
                icon={tab === "done" ? CheckCircleIcon : InboxIcon}
                title={emptyCopy[tab].title}
                message={emptyCopy[tab].message}
              />
            )
          }
        />
      )}

      <SellerToast toast={toast} onHide={hideToast} />

      <OrderDetailSheet
        order={selectedOrder}
        onClose={closeOrder}
        onAdvance={handleAdvance}
        isAdvancing={isUpdatingStatus && advancingId === selectedOrder?.id}
      />
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    header: { paddingBottom: SPACE.lg },
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
    subtitle: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 2 },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.sm,
      marginTop: SPACE.lg,
      paddingHorizontal: SPACE.md,
      height: 46,
      borderRadius: RADIUS.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
      fontSize: 14.5,
      fontWeight: "500",
      padding: 0,
    },
    filters: { marginTop: SPACE.md },
    listContent: { paddingBottom: 130 },
  });
