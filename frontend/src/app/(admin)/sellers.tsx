/**
 * OmniQ mobile app - admin seller management.
 *
 * Approving, rejecting and suspending a business are consequential and irreversible-feeling
 * actions, so this screen is built around making the current state obvious and the action
 * deliberate: one status vocabulary shared with the rest of the console, tab counts so an operator
 * can see the queue without opening it, and a confirmation on anything that takes a live seller
 * off the platform.
 *
 * Author: OmniQ Team
 */
// Explicit React import: this tsconfig uses the classic JSX transform, so a file rendering JSX
// without it resolves `React` to a UMD global and TypeScript reports TS2686 on every element.
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "expo-router";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { confirmAction, errorMessage, notify } from "@/utils/dialog";
import { RADIUS, SHADOW, SPACE, sellerStatusMeta, withAlpha } from "@/constants/adminTheme";
import {
  AdminHeader,
  EmptyState,
  QueryBoundary,
  SegmentedTabs,
  SkeletonRows,
  StatusPill,
  type SegmentItem
} from "@/components/admin/AdminUI";
import { MapPinIcon, StoreIcon, TagIcon } from "@/components/ui/SellerIcons";

type TabKey = "pending" | "approved" | "inactive";

export default function AdminSellersScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  // Pull-to-refresh for this list. `Screen` owns it for scrolling screens; this one
  // passes scroll={false}, so the list attaches it itself.
  const refreshControl = useRefreshControl();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const sellersQuery = useQuery({
    queryKey: ["adminSellers"],
    queryFn: async () => {
      const res = await apiClient.get("/sellers");
      return res.data?.data ?? [];
    }
  });

  const sellers: any[] = sellersQuery.data ?? [];

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(`/sellers/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSellers"] });
      // The dashboard's pending/active seller counts are derived from these rows.
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
    },
    onError: (err: unknown) => {
      notify("Couldn't update the seller", errorMessage(err, "Please try again."));
    }
  });

  // ⚡ PERFORMANCE: one pass over the sellers produces both the buckets and the tab counts, rather
  // than three filters plus three more for the badges.
  const { buckets, tabs } = useMemo(() => {
    const grouped: Record<TabKey, any[]> = { pending: [], approved: [], inactive: [] };
    for (const seller of sellers) {
      const status = String(seller.status ?? "").toLowerCase();
      if (status === "pending") grouped.pending.push(seller);
      else if (status === "approved" || status === "active") grouped.approved.push(seller);
      else grouped.inactive.push(seller);
    }
    const items: SegmentItem[] = [
      { key: "pending", label: "Requests", count: grouped.pending.length },
      { key: "approved", label: "Approved", count: grouped.approved.length },
      { key: "inactive", label: "Inactive", count: grouped.inactive.length }
    ];
    return { buckets: grouped, tabs: items };
  }, [sellers]);

  const visible = buckets[activeTab];

  /**
   * Anything that removes a live seller from the platform asks first. The platform branching this
   * used to do inline now lives in utils/dialog, shared with the rest of the console.
   */
  const confirmThen = useCallback(
    (title: string, message: string, onConfirm: () => void, destructive = true) =>
      confirmAction(title, message, onConfirm, { destructive }),
    []
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerBlock}>
        <AdminHeader
          title="Sellers"
          subtitle={
            buckets.pending.length > 0
              ? `${buckets.pending.length} business${buckets.pending.length === 1 ? "" : "es"} waiting on you`
              : "Every application has been reviewed"
          }
        />
        <SegmentedTabs items={tabs} value={activeTab} onChange={(key) => setActiveTab(key as TabKey)} />
      </View>
    ),
    [styles, buckets.pending.length, tabs, activeTab]
  );

  const renderItem = useCallback(
    ({ item: seller }: { item: any }) => {
      const status = String(seller.status ?? "").toLowerCase();
      const meta = sellerStatusMeta(seller.status, colors);
      const busy = updateStatus.isPending && updateStatus.variables?.id === seller.id;

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.identity}>
              <Text style={styles.storeName} numberOfLines={2}>
                {seller.business_name || "Unnamed store"}
              </Text>
              <View style={styles.metaRow}>
                <TagIcon size={11} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {seller.category || "Uncategorised"}
                </Text>
                <View style={styles.dot} />
                <MapPinIcon size={11} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {seller.city || "City not set"}
                </Text>
              </View>
            </View>
            <StatusPill label={meta.label} color={meta.color} tint={meta.tint} />
          </View>

          <Text style={styles.description} numberOfLines={3}>
            {seller.description || "No description provided."}
          </Text>

          {seller.gst_number ? (
            <View style={styles.gstRow}>
              <Text style={styles.gstLabel}>GSTIN</Text>
              <Text style={styles.gstValue} selectable>
                {seller.gst_number}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {status === "pending" ? (
              <>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    confirmThen(
                      "Approve this seller?",
                      `${seller.business_name || "This business"} will be able to list products and take orders immediately.`,
                      () => updateStatus.mutate({ id: seller.id, status: "approved" }),
                      false
                    )
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                >
                  <Text style={styles.btnPrimaryText}>{busy ? "Working…" : "Approve"}</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    confirmThen(
                      "Reject this application?",
                      "The business will not be able to sell on OmniQ. They can apply again later.",
                      () => updateStatus.mutate({ id: seller.id, status: "rejected" })
                    )
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
                >
                  <Text style={styles.btnGhostText}>Reject</Text>
                </Pressable>
              </>
            ) : null}

            {status === "approved" || status === "active" ? (
              <>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    router.push(
                      `/(admin)/seller-products?sellerId=${seller.id}&storeName=${encodeURIComponent(seller.business_name || "")}`
                    )
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
                >
                  <Text style={styles.btnGhostText}>Review products</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    confirmThen(
                      "Suspend this seller?",
                      `${seller.business_name || "This business"}'s products will be hidden from buyers straight away. Existing orders are unaffected.`,
                      () => updateStatus.mutate({ id: seller.id, status: "suspended" })
                    )
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.pressed]}
                >
                  <Text style={styles.btnDangerText}>{busy ? "Working…" : "Suspend"}</Text>
                </Pressable>
              </>
            ) : null}

            {status === "suspended" || status === "rejected" ? (
              <Pressable
                disabled={busy}
                onPress={() =>
                  confirmThen(
                    "Restore this seller?",
                    "Their products go back on the storefront immediately.",
                    () => updateStatus.mutate({ id: seller.id, status: "approved" }),
                    false
                  )
                }
                accessibilityRole="button"
                style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
              >
                <Text style={styles.btnPrimaryText}>{busy ? "Working…" : "Restore"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    },
    [colors, styles, updateStatus, router, confirmThen]
  );

  return (
    <Screen scroll={false}>
      <QueryBoundary
        isLoading={sellersQuery.isLoading}
        error={sellersQuery.error}
        onRetry={sellersQuery.refetch}
        skeleton={
          <>
            {renderHeader()}
            <SkeletonRows count={4} />
          </>
        }
      >
        <FlashList
          data={visible}
          refreshControl={refreshControl}
          renderItem={renderItem}
          keyExtractor={(item: any) => String(item.id)}
          {...({ estimatedItemSize: 220 } as any)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACE.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon={StoreIcon}
              title={
                activeTab === "pending"
                  ? "No applications waiting"
                  : activeTab === "approved"
                    ? "No approved sellers yet"
                    : "No suspended or rejected sellers"
              }
              message={
                activeTab === "pending"
                  ? "New seller applications land here for review."
                  : activeTab === "approved"
                    ? "Approve an application and the business appears here."
                    : "Sellers you suspend or reject are listed here so you can restore them."
              }
            />
          }
        />
      </QueryBoundary>
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    headerBlock: { paddingBottom: SPACE.lg },
    pressed: { opacity: 0.85 },

    card: {
      borderRadius: RADIUS.lg,
      padding: SPACE.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      ...SHADOW.sm
    },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md, marginBottom: SPACE.md },
    identity: { flex: 1 },
    storeName: { color: colors.textPrimary, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
    metaText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", flexShrink: 1 },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border, marginHorizontal: 2 },

    description: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: SPACE.md },

    gstRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.sm,
      paddingVertical: SPACE.sm,
      paddingHorizontal: SPACE.md,
      backgroundColor: colors.bgTertiary,
      borderRadius: RADIUS.sm,
      marginBottom: SPACE.lg
    },
    gstLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
    gstValue: { color: colors.textPrimary, fontSize: 12.5, fontWeight: "700", flex: 1 },

    actions: { flexDirection: "row", gap: SPACE.md },
    btn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center"
    },
    btnPrimary: { backgroundColor: colors.accent },
    btnPrimaryText: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "800" },
    btnGhost: { backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border },
    btnGhostText: { color: colors.textPrimary, fontSize: 13.5, fontWeight: "700" },
    btnDanger: { backgroundColor: withAlpha(colors.danger, 0.1), borderWidth: 1, borderColor: withAlpha(colors.danger, 0.3) },
    btnDangerText: { color: colors.danger, fontSize: 13.5, fontWeight: "800" }
  });
