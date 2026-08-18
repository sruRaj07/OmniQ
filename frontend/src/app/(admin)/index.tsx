/**
 * OmniQ mobile app - admin dashboard.
 *
 * The console's job is to answer, in one screen, "what needs my attention and is the platform
 * healthy?". Two rules follow from that and are enforced below:
 *
 *  1. No number is rendered without its provenance. Every query goes through QueryBoundary, so a
 *     failed request shows the failure instead of falling back to `?? 0`. The previous version
 *     destructured `error` and never used it, which is why a 403 rendered as a perfectly calm
 *     dashboard reporting ₹0 GMV and no sellers.
 *  2. The queue comes before the statistics. Pending approvals and customer requests sit above the
 *     KPI grid, because they are the only things on this screen that need a human.
 *
 * Author: OmniQ Team
 */
// Explicit React import: this tsconfig uses the classic JSX transform, so a file rendering JSX
// without it resolves `React` to a UMD global and TypeScript reports TS2686 on every element.
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Screen } from "@/components/shared/Screen";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { RADIUS, SPACE, compactCount, compactInr, withAlpha } from "@/constants/adminTheme";
import { confirmAction, errorMessage, notify } from "@/utils/dialog";
import {
  AdminHeader,
  AttentionCard,
  BreakdownBar,
  FreshnessLabel,
  QueryBoundary,
  SectionHeader,
  StatTile,
  StatTileSkeleton,
  Surface
} from "@/components/admin/AdminUI";
import { InboxIcon, LogOutIcon, StoreIcon } from "@/components/ui/SellerIcons";
// These three predate the SellerIcons set and live in their own modules.
import { BoxIcon } from "@/components/ui/BoxIcon";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";

export default function AdminDashboardScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const dashboard = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/dashboard");
      return res.data?.data;
    }
  });

  const requests = useQuery({
    queryKey: ["adminUserRequests"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/user-requests?status=pending");
      return res.data?.data ?? [];
    },
    refetchOnMount: "always",
    staleTime: 0
  });

  const data = dashboard.data;
  const pendingRequests: any[] = requests.data ?? [];

  const actionRequestMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const res = await apiClient.patch(`/admin/user-requests/${id}`, { status, adminNotes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserRequests"] });
      // Actioning a request moves the dashboard's pending count, so pull it back in sync too.
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      notify("Done", "The request has been actioned.");
    },
    onError: (err: unknown) => {
      notify("Couldn't action the request", errorMessage(err, "Please try again."));
    }
  });

  const handleActionRequest = useCallback(
    (id: string, status: string, type: string) => {
      if (status === "rejected") {
        actionRequestMutation.mutate({ id, status });
        return;
      }

      const readable = type.replace(/_/g, " ");
      const message =
        type === "account_deletion"
          ? `Approve this ${readable} request?\n\nThis permanently deletes the account. Their orders are anonymised and kept for records. This cannot be undone.`
          : `Approve this ${readable} request?`;

      confirmAction("Confirm approval", message, () => actionRequestMutation.mutate({ id, status }), {
        confirmLabel: "Approve",
        destructive: type === "account_deletion"
      });
    },
    [actionRequestMutation]
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().setSession(null);
    router.replace("/");
  }, []);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
    []
  );

  // Order health, computed from the same figures the tiles show so the bar cannot contradict them.
  const orderMix = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Open", value: data.openOrders ?? 0, display: compactCount(data.openOrders ?? 0), color: colors.warning },
      {
        label: "Delivered",
        value: data.deliveredOrders ?? 0,
        display: compactCount(data.deliveredOrders ?? 0),
        color: colors.success
      },
      {
        label: "Cancelled",
        value: data.cancelledOrders ?? 0,
        display: compactCount(data.cancelledOrders ?? 0),
        color: colors.danger
      }
    ].filter((row) => row.value > 0);
  }, [data, colors]);

  return (
    <Screen scroll>
      <AdminHeader
        title="Overview"
        subtitle={today}
        actions={
          <>
            <RefreshButton size={34} />
            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              hitSlop={6}
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            >
              <LogOutIcon size={15} color={colors.danger} strokeWidth={2.2} />
            </Pressable>
          </>
        }
      />

      <FreshnessLabel
        updatedAt={dashboard.dataUpdatedAt || undefined}
        isFetching={dashboard.isFetching}
        style={styles.freshness}
      />

      <QueryBoundary
        isLoading={dashboard.isLoading}
        error={dashboard.error}
        onRetry={dashboard.refetch}
        onSignOut={handleLogout}
        skeleton={
          <View style={styles.tileGrid}>
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
          </View>
        }
      >
        {/* THE QUEUE - what actually needs a person, before any statistics */}
        <View style={styles.attentionStack}>
          <AttentionCard
            count={data?.pendingSellers ?? 0}
            title="Sellers awaiting approval"
            message="New businesses can't list products until they're reviewed."
            tone="warning"
            onPress={() => router.push("/(admin)/sellers")}
          />
          <AttentionCard
            count={data?.pendingRequests ?? 0}
            title="Customer requests open"
            message="Data export and account deletion requests are time-bound."
            tone="danger"
            actionLabel="See below"
          />
          <AttentionCard
            count={data?.flagged ?? 0}
            title="Products taken down"
            message="Removed from the storefront by moderation."
            tone="accent"
          />
        </View>

        {/* GMV - the headline number, with the two windows that give it meaning */}
        <Surface style={styles.gmvCard} elevation="md">
          <Text style={styles.gmvLabel}>GROSS MERCHANDISE VALUE</Text>
          <Text style={styles.gmvValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {compactInr(data?.gmv ?? 0)}
          </Text>
          <Text style={styles.gmvNote}>Delivered and in-flight orders. Cancellations excluded.</Text>

          <View style={styles.gmvSplit}>
            <View style={styles.gmvSplitItem}>
              <Text style={styles.gmvSplitLabel}>LAST 24 HOURS</Text>
              <Text style={styles.gmvSplitValue}>{compactInr(data?.gmv24h ?? 0)}</Text>
              <Text style={styles.gmvSplitSub}>
                {compactCount(data?.orders24h ?? 0)} order{(data?.orders24h ?? 0) === 1 ? "" : "s"}
              </Text>
            </View>
            <View style={styles.gmvDivider} />
            <View style={styles.gmvSplitItem}>
              <Text style={styles.gmvSplitLabel}>LAST 7 DAYS</Text>
              <Text style={styles.gmvSplitValue}>{compactInr(data?.gmv7d ?? 0)}</Text>
              <Text style={styles.gmvSplitSub}>rolling window</Text>
            </View>
          </View>
        </Surface>

        {/* KPI GRID - each tile navigates to the screen that explains it */}
        <View style={styles.tileGrid}>
          <StatTile
            label="Orders"
            value={compactCount(data?.orders ?? 0)}
            caption={`${compactCount(data?.openOrders ?? 0)} still open`}
            captionTone={(data?.openOrders ?? 0) > 0 ? "warning" : "muted"}
            icon={BoxIcon}
            onPress={() => router.push("/(admin)/orders")}
          />
          <StatTile
            label="Active sellers"
            value={compactCount(data?.activeSellers ?? 0)}
            caption={
              (data?.pendingSellers ?? 0) > 0
                ? `${compactCount(data.pendingSellers)} pending`
                : (data?.suspendedSellers ?? 0) > 0
                  ? `${compactCount(data.suspendedSellers)} suspended`
                  : "all reviewed"
            }
            captionTone={(data?.pendingSellers ?? 0) > 0 ? "warning" : "positive"}
            icon={StoreIcon}
            accent={colors.success}
            onPress={() => router.push("/(admin)/sellers")}
          />
          <StatTile
            label="Buyers"
            value={compactCount(data?.registeredBuyers ?? 0)}
            caption="registered accounts"
            icon={UsersIcon}
            accent="#0284C7"
          />
          <StatTile
            label="Taken down"
            value={compactCount(data?.flagged ?? 0)}
            caption={(data?.flagged ?? 0) > 0 ? "hidden from buyers" : "nothing flagged"}
            captionTone={(data?.flagged ?? 0) > 0 ? "danger" : "positive"}
            icon={FlagIcon}
            accent={colors.danger}
          />
        </View>

        {/* ORDER HEALTH */}
        {orderMix.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Order health" caption="Every order ever placed, by outcome" />
            <Surface style={styles.plainCard}>
              <BreakdownBar rows={orderMix} />
            </Surface>
          </View>
        ) : null}

        {/* TOP SELLERS */}
        {data?.topSellers?.length ? (
          <View style={styles.section}>
            <SectionHeader
              title="Top sellers by GMV"
              caption="Across all time"
              actionLabel="Manage"
              onAction={() => router.push("/(admin)/sellers")}
            />
            <Surface style={styles.plainCard}>
              {data.topSellers.map((seller: any, index: number) => (
                <View key={seller.id} style={[styles.sellerRow, index > 0 && styles.sellerRowDivided]}>
                  <View style={styles.rank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.sellerBody}>
                    <Text style={styles.sellerName} numberOfLines={1}>
                      {seller.name || "Unnamed store"}
                    </Text>
                    <Text style={styles.sellerMeta} numberOfLines={1}>
                      {[seller.city, `${compactCount(seller.orders)} order${seller.orders === 1 ? "" : "s"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Text style={styles.sellerGmv}>{compactInr(seller.gmv)}</Text>
                </View>
              ))}
            </Surface>
          </View>
        ) : null}
      </QueryBoundary>

      {/* CUSTOMER REQUESTS - its own boundary, so a failure here doesn't blank the dashboard */}
      <View style={styles.section}>
        <SectionHeader
          title="Customer requests"
          caption="Data exports and account deletions awaiting a decision"
        />
        <QueryBoundary
          isLoading={requests.isLoading}
          error={requests.error}
          onRetry={requests.refetch}
          isEmpty={pendingRequests.length === 0}
          skeleton={<Surface style={styles.plainCard}><Text style={styles.mutedLine}>Loading requests…</Text></Surface>}
          empty={
            <Surface style={styles.plainCard}>
              <View style={styles.emptyRow}>
                <InboxIcon size={18} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.mutedLine}>Nothing waiting. All requests have been actioned.</Text>
              </View>
            </Surface>
          }
        >
          <View style={{ gap: SPACE.md }}>
            {pendingRequests.map((req: any) => {
              const isDeletion = req.type === "account_deletion";
              return (
                <Surface key={req.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={{ flex: 1, paddingRight: SPACE.md }}>
                      <Text style={styles.requestUser} numberOfLines={1}>
                        {req.profile?.full_name || req.profile?.email || "Unknown user"}
                      </Text>
                      <Text style={styles.requestEmail} numberOfLines={1}>
                        {req.profile?.email || "No email on file"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.requestBadge,
                        {
                          backgroundColor: withAlpha(isDeletion ? colors.danger : "#0284C7", 0.12)
                        }
                      ]}
                    >
                      <Text style={[styles.requestBadgeText, { color: isDeletion ? colors.danger : "#0284C7" }]}>
                        {isDeletion ? "Delete account" : "Data export"}
                      </Text>
                    </View>
                  </View>

                  {req.reason ? <Text style={styles.requestReason}>“{req.reason}”</Text> : null}

                  <Text style={styles.requestDate}>
                    Requested {new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>

                  <View style={styles.requestActions}>
                    <Pressable
                      onPress={() => handleActionRequest(req.id, "rejected", req.type)}
                      disabled={actionRequestMutation.isPending}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.requestBtn, styles.rejectBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleActionRequest(req.id, "approved", req.type)}
                      disabled={actionRequestMutation.isPending}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.requestBtn,
                        { backgroundColor: isDeletion ? colors.danger : colors.accent },
                        pressed && styles.pressed
                      ]}
                    >
                      <Text style={styles.approveBtnText}>
                        {actionRequestMutation.isPending ? "Working…" : "Approve"}
                      </Text>
                    </Pressable>
                  </View>
                </Surface>
              );
            })}
          </View>
        </QueryBoundary>
      </View>

      {/* Clearance for the bottom nav bar */}
      <View style={{ height: 72 }} />
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    logoutBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: withAlpha(colors.danger, 0.3),
      backgroundColor: withAlpha(colors.danger, 0.07)
    },
    pressed: { opacity: 0.85 },
    freshness: { marginTop: -SPACE.md, marginBottom: SPACE.xl },

    attentionStack: { gap: SPACE.md, marginBottom: SPACE.xl },

    gmvCard: { padding: SPACE.xl, marginBottom: SPACE.lg },
    gmvLabel: {
      color: colors.textMuted,
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 1.1
    },
    gmvValue: {
      color: colors.textPrimary,
      fontSize: 40,
      fontWeight: "900",
      letterSpacing: -1.6,
      marginTop: SPACE.sm
    },
    gmvNote: { color: colors.textMuted, fontSize: 11.5, marginTop: 4 },
    gmvSplit: {
      flexDirection: "row",
      alignItems: "stretch",
      marginTop: SPACE.xl,
      paddingTop: SPACE.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    gmvSplitItem: { flex: 1 },
    gmvDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: SPACE.lg },
    gmvSplitLabel: {
      color: colors.textMuted,
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.9
    },
    gmvSplitValue: {
      color: colors.textPrimary,
      fontSize: 19,
      fontWeight: "900",
      letterSpacing: -0.5,
      marginTop: 5
    },
    gmvSplitSub: { color: colors.textSecondary, fontSize: 11.5, fontWeight: "600", marginTop: 2 },

    tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.md },

    section: { marginTop: SPACE.xxl },
    plainCard: { padding: SPACE.lg },
    mutedLine: { color: colors.textSecondary, fontSize: 13, flex: 1 },
    emptyRow: { flexDirection: "row", alignItems: "center", gap: SPACE.md },

    sellerRow: { flexDirection: "row", alignItems: "center", gap: SPACE.md, paddingVertical: SPACE.md },
    sellerRowDivided: { borderTopWidth: 1, borderTopColor: colors.border },
    rank: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.bgTertiary,
      alignItems: "center",
      justifyContent: "center"
    },
    rankText: { color: colors.textSecondary, fontSize: 12, fontWeight: "900" },
    sellerBody: { flex: 1 },
    sellerName: { color: colors.textPrimary, fontSize: 14.5, fontWeight: "700" },
    sellerMeta: { color: colors.textMuted, fontSize: 11.5, fontWeight: "600", marginTop: 2 },
    sellerGmv: { color: colors.textPrimary, fontSize: 14.5, fontWeight: "900" },

    requestCard: { padding: SPACE.lg },
    requestHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: SPACE.md },
    requestUser: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    requestEmail: { color: colors.textSecondary, fontSize: 12.5, marginTop: 2 },
    requestBadge: { paddingHorizontal: SPACE.sm, paddingVertical: 4, borderRadius: RADIUS.xs },
    requestBadgeText: { fontSize: 11, fontWeight: "800" },
    requestReason: {
      color: colors.textPrimary,
      fontSize: 13.5,
      lineHeight: 20,
      backgroundColor: colors.bgTertiary,
      padding: SPACE.md,
      borderRadius: RADIUS.sm,
      marginBottom: SPACE.md,
      fontStyle: "italic"
    },
    requestDate: { color: colors.textMuted, fontSize: 11.5, fontWeight: "600", marginBottom: SPACE.lg },
    requestActions: { flexDirection: "row", gap: SPACE.md },
    requestBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center"
    },
    rejectBtn: { backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border },
    rejectBtnText: { color: colors.textPrimary, fontSize: 13.5, fontWeight: "700" },
    approveBtnText: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "800" }
  });
