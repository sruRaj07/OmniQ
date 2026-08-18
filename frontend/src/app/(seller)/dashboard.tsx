/**
 * OmniQ mobile app - seller dashboard.
 *
 * Ordered by what a seller needs first thing in the morning: anything that is blocking a
 * sale, then today's numbers, then the week, then the orders waiting to be packed.
 *
 * Author: OmniQ Team
 */
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/seller/KpiCard";
import { OrderCard } from "@/components/seller/OrderCard";
import { RevenueChart } from "@/components/seller/RevenueChart";
import { SELLER_NAV_ITEMS } from "@/components/seller/sellerNav";
import {
  Avatar,
  EmptyState,
  SectionHeader,
  Shimmer,
  SkeletonBox,
  SkeletonRows,
} from "@/components/seller/SellerUI";
import { Screen } from "@/components/shared/Screen";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { useThemeColors } from "@/store/useThemeStore";
import { useOrders } from "@/hooks/useOrders";
import { useSellerProducts } from "@/hooks/useProducts";
import { apiClient } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";
import { orderTotalOf } from "@/constants/delivery";
import {
  LOW_STOCK_THRESHOLD,
  RADIUS,
  SHADOW,
  SPACE,
  stockOf,
  withAlpha,
} from "@/constants/sellerTheme";
import {
  AlertIcon,
  ChartIcon,
  ChevronRightIcon,
  InboxIcon,
  PackageIcon,
  PlusIcon,
  StarIcon,
  StoreIcon,
  WalletIcon,
} from "@/components/ui/SellerIcons";

const DAY_MS = 24 * 60 * 60 * 1000;

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function SellerDashboardScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();

  const { sellerOrders, isLoading: isOrdersLoading } = useOrders();
  const { products, isLoading: isProductsLoading } = useSellerProducts();
  const { data: sellerData, isLoading: isSellerLoading } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sellers/me");
      return data.data;
    },
  });

  const isLoading = isOrdersLoading || isProductsLoading || isSellerLoading;
  const businessName = sellerData?.business_name || "OmniQ Seller";

  /**
   * ⚡ PERFORMANCE: every derived number lives in one memo keyed on the two query results.
   * The screen previously recomputed seven days of filtering on every render, including
   * renders caused only by the nav bar animation.
   */
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const yesterdayStart = todayStart - DAY_MS;

    const active = sellerOrders.filter((order: any) => order.status !== "cancelled");

    let revenueToday = 0;
    let revenueYesterday = 0;
    let ordersToday = 0;
    let ordersYesterday = 0;

    // Seven buckets, oldest first, filled in a single pass over the orders.
    const dailyRevenue = new Array(7).fill(0);
    const weekStart = todayStart - 6 * DAY_MS;

    for (const order of active) {
      const placed = new Date(order.created_at).getTime();
      if (!Number.isFinite(placed)) continue;
      const amount = orderTotalOf(order);

      if (placed >= todayStart) {
        revenueToday += amount;
        ordersToday += 1;
      } else if (placed >= yesterdayStart) {
        revenueYesterday += amount;
        ordersYesterday += 1;
      }

      if (placed >= weekStart) {
        const bucket = Math.floor((placed - weekStart) / DAY_MS);
        if (bucket >= 0 && bucket < 7) dailyRevenue[bucket] += amount;
      }
    }

    const days = Array.from({ length: 7 }, (_, index) => new Date(weekStart + index * DAY_MS));

    const pendingOrders = sellerOrders.filter((order: any) => order.status === "pending");
    const recentOrders = [...sellerOrders]
      .filter((order: any) => order.status !== "cancelled" && order.status !== "delivered")
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    // The products table has no `is_active` column — approval and flagging are the real
    // gates on a listing being visible to buyers.
    const live = products.filter((product: any) => product.is_approved && !product.is_flagged);
    const inReview = products.filter((product: any) => !product.is_approved && !product.is_flagged);
    const rejected = products.filter((product: any) => product.is_flagged);
    const outOfStock = products.filter((product: any) => stockOf(product) === 0);
    const lowStock = products.filter((product: any) => {
      const stock = stockOf(product);
      return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
    });

    const revenueDelta =
      revenueYesterday > 0 ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100) : null;

    return {
      revenueToday,
      revenueDelta,
      ordersToday,
      ordersDelta: ordersToday - ordersYesterday,
      dailyRevenue,
      days,
      pendingCount: pendingOrders.length,
      pendingValue: pendingOrders.reduce((sum: number, order: any) => sum + orderTotalOf(order), 0),
      recentOrders,
      liveCount: live.length,
      reviewCount: inReview.length,
      rejectedCount: rejected.length,
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
    };
  }, [products, sellerOrders]);

  const revenueTrend = useMemo(() => {
    if (stats.revenueDelta === null) {
      return stats.revenueToday > 0
        ? { text: "First sales today", direction: "up" as const }
        : { text: "No sales yet today", direction: "flat" as const };
    }
    if (stats.revenueDelta === 0) return { text: "Same as yesterday", direction: "flat" as const };
    return {
      text: `${Math.abs(stats.revenueDelta)}% vs yesterday`,
      direction: stats.revenueDelta > 0 ? ("up" as const) : ("down" as const),
    };
  }, [stats.revenueDelta, stats.revenueToday]);

  const ordersTrend = useMemo(() => {
    if (stats.ordersDelta === 0) return { text: "Same as yesterday", direction: "flat" as const };
    return {
      text: `${Math.abs(stats.ordersDelta)} ${stats.ordersDelta > 0 ? "more" : "fewer"} than yesterday`,
      direction: stats.ordersDelta > 0 ? ("up" as const) : ("down" as const),
    };
  }, [stats.ordersDelta]);

  const goToOrders = useCallback(() => router.push("/(seller)/seller-orders" as any), [router]);
  const goToProducts = useCallback(() => router.push("/(seller)/products" as any), [router]);
  const goToProfile = useCallback(() => router.push("/(seller)/seller-profile" as any), [router]);
  const composeProduct = useCallback(
    () => router.push({ pathname: "/(seller)/products", params: { compose: "1" } } as any),
    [router]
  );
  const goToStockIssues = useCallback(
    () => router.push({ pathname: "/(seller)/products", params: { filter: "stock" } } as any),
    [router]
  );
  const goToReview = useCallback(
    () => router.push({ pathname: "/(seller)/products", params: { filter: "review" } } as any),
    [router]
  );

  if (isLoading) {
    return (
      <Screen bottomNavItems={SELLER_NAV_ITEMS}>
        <DashboardSkeleton />
      </Screen>
    );
  }

  // At most one banner: the most urgent thing wins, so the top of the screen never
  // becomes a stack of warnings the seller learns to scroll past.
  const alert =
    stats.pendingCount > 0
      ? {
          tone: colors.warning,
          icon: InboxIcon,
          title: `${stats.pendingCount} order${stats.pendingCount === 1 ? "" : "s"} waiting to be packed`,
          body: `${formatCurrency(stats.pendingValue)} ready to fulfil`,
          onPress: goToOrders,
        }
      : stats.outOfStockCount > 0
        ? {
            tone: colors.danger,
            icon: AlertIcon,
            title: `${stats.outOfStockCount} listing${stats.outOfStockCount === 1 ? " is" : "s are"} out of stock`,
            body: "Buyers cannot order these until you restock",
            onPress: goToStockIssues,
          }
        : stats.rejectedCount > 0
          ? {
              tone: colors.danger,
              icon: AlertIcon,
              title: `${stats.rejectedCount} listing${stats.rejectedCount === 1 ? " was" : "s were"} rejected`,
              body: "Edit and resubmit to get them live",
              onPress: goToReview,
            }
          : stats.lowStockCount > 0
            ? {
                tone: colors.warning,
                icon: PackageIcon,
                title: `${stats.lowStockCount} listing${stats.lowStockCount === 1 ? " is" : "s are"} running low`,
                body: `${LOW_STOCK_THRESHOLD} or fewer left in stock`,
                onPress: goToStockIssues,
              }
            : null;

  const AlertIconComponent = alert?.icon;

  return (
    <Screen bottomNavItems={SELLER_NAV_ITEMS}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting(new Date().getHours())}</Text>
          <Text style={styles.business} numberOfLines={1}>
            {businessName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Revenue and order counts move all day; a seller should not have to relaunch
              the app to see an order that just came in. */}
          <RefreshButton size={38} />
          <Pressable onPress={goToProfile} accessibilityRole="button" accessibilityLabel="Open store profile">
            <Avatar name={businessName} size={44} />
          </Pressable>
        </View>
      </View>

      {alert && AlertIconComponent ? (
        <Pressable
          onPress={alert.onPress}
          style={({ pressed }) => [
            styles.alert,
            { backgroundColor: withAlpha(alert.tone, 0.08), borderColor: withAlpha(alert.tone, 0.25) },
            pressed && styles.alertPressed,
          ]}
        >
          <View style={[styles.alertIcon, { backgroundColor: withAlpha(alert.tone, 0.14) }]}>
            <AlertIconComponent size={17} color={alert.tone} strokeWidth={2.2} />
          </View>
          <View style={styles.alertBody}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertText}>{alert.body}</Text>
          </View>
          <ChevronRightIcon size={17} color={alert.tone} strokeWidth={2.4} />
        </Pressable>
      ) : null}

      <View style={styles.kpiRow}>
        <KpiCard
          label="Revenue today"
          value={formatCurrency(stats.revenueToday)}
          trend={revenueTrend.text}
          direction={revenueTrend.direction}
          icon={WalletIcon}
          tone={colors.success}
        />
        <KpiCard
          label="Orders today"
          value={String(stats.ordersToday)}
          trend={ordersTrend.text}
          direction={ordersTrend.direction}
          icon={InboxIcon}
          onPress={goToOrders}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label="Listings live"
          value={String(stats.liveCount)}
          trend={stats.reviewCount > 0 ? `${stats.reviewCount} in review` : "All listings reviewed"}
          direction={stats.reviewCount > 0 ? "flat" : "up"}
          icon={PackageIcon}
          tone={colors.accent}
          onPress={goToProducts}
        />
        <KpiCard
          label="Store rating"
          value="—"
          trend="No reviews yet"
          icon={StarIcon}
          tone={colors.gold}
        />
      </View>

      <View style={styles.chartWrap}>
        <RevenueChart data={stats.dailyRevenue} days={stats.days} />
      </View>

      <SectionHeader title="Quick actions" style={styles.sectionSpacing} />
      <View style={styles.quickRow}>
        <QuickAction icon={PlusIcon} label="Add product" onPress={composeProduct} colors={colors} highlight />
        <QuickAction icon={ChartIcon} label="Inventory" onPress={goToProducts} colors={colors} />
        <QuickAction icon={StoreIcon} label="Store" onPress={goToProfile} colors={colors} />
      </View>

      <SectionHeader
        title="Needs packing"
        caption={stats.recentOrders.length > 0 ? "Oldest first once you open the list" : undefined}
        actionLabel="View all"
        onAction={goToOrders}
        style={styles.sectionSpacing}
      />

      {stats.recentOrders.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Nothing to pack"
          message="New orders land here the moment a buyer checks out."
          compact
        />
      ) : (
        <View style={styles.orders}>
          {stats.recentOrders.map((order: any) => (
            <OrderCard key={order.id} order={order} onPress={goToOrders} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const QuickAction = React.memo(function QuickAction({
  icon: Icon,
  label,
  onPress,
  colors,
  highlight,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
  colors: any;
  highlight?: boolean;
}) {
  const styles = useMemo(() => getQuickStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, highlight && styles.actionHighlight, pressed && styles.pressed]}
    >
      <View style={[styles.iconChip, highlight && styles.iconChipHighlight]}>
        <Icon size={18} color={highlight ? "#FFFFFF" : colors.textPrimary} strokeWidth={2.2} />
      </View>
      <Text style={[styles.label, highlight && styles.labelHighlight]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

const getQuickStyles = (colors: any) =>
  StyleSheet.create({
    action: {
      flex: 1,
      alignItems: "center",
      gap: SPACE.sm,
      paddingVertical: SPACE.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      ...SHADOW.sm,
    },
    actionHighlight: { borderColor: withAlpha(colors.accent, 0.3), backgroundColor: withAlpha(colors.accent, 0.06) },
    pressed: { opacity: 0.85 },
    iconChip: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md,
      backgroundColor: colors.bgTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    iconChipHighlight: { backgroundColor: colors.accent },
    label: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    labelHighlight: { color: colors.accent },
  });

function DashboardSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <>
      <Shimmer style={styles.skeletonHeader}>
        <View>
          <SkeletonBox width={110} height={12} />
          <SkeletonBox width={180} height={22} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBox width={44} height={44} radius={RADIUS.lg} />
      </Shimmer>
      <Shimmer>
        <View style={styles.kpiRow}>
          <SkeletonBox height={118} radius={RADIUS.lg} style={{ flex: 1 }} />
          <SkeletonBox height={118} radius={RADIUS.lg} style={{ flex: 1 }} />
        </View>
        <View style={styles.kpiRow}>
          <SkeletonBox height={118} radius={RADIUS.lg} style={{ flex: 1 }} />
          <SkeletonBox height={118} radius={RADIUS.lg} style={{ flex: 1 }} />
        </View>
        <SkeletonBox height={230} radius={RADIUS.lg} style={{ marginTop: SPACE.lg }} />
      </Shimmer>
      <View style={styles.sectionSpacing} />
      <SkeletonRows count={2} />
    </>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACE.md,
      marginBottom: SPACE.xl,
    },
    headerText: { flex: 1, minWidth: 0 },
    greeting: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
    business: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
    alert: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      padding: SPACE.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      marginBottom: SPACE.lg,
    },
    alertPressed: { opacity: 0.85 },
    alertIcon: { width: 34, height: 34, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
    alertBody: { flex: 1, minWidth: 0 },
    alertTitle: { color: colors.textPrimary, fontSize: 13.5, fontWeight: "800", lineHeight: 18 },
    alertText: { color: colors.textSecondary, fontSize: 12, fontWeight: "500", marginTop: 2 },
    kpiRow: { flexDirection: "row", gap: SPACE.md, marginBottom: SPACE.md },
    chartWrap: { marginTop: SPACE.sm },
    sectionSpacing: { marginTop: SPACE.xxl, marginBottom: SPACE.md },
    quickRow: { flexDirection: "row", gap: SPACE.md },
    orders: { marginTop: SPACE.xs },
    skeletonHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACE.xl,
    },
  });
