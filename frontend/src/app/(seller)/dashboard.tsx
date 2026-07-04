import { Link } from "expo-router";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { KpiCard } from "@/components/seller/KpiCard";
import { OrderCard } from "@/components/seller/OrderCard";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useOrders } from "@/hooks/useOrders";
import { useSellerProducts } from "@/hooks/useProducts";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";

export default function SellerDashboardScreen() {
  const { sellerOrders, isLoading: isOrdersLoading } = useOrders();
  const { products, isLoading: isProductsLoading } = useSellerProducts();

  const { data: sellerData, isLoading: isSellerLoading } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sellers/me");
      return data.data;
    }
  });

  const isLoading = isOrdersLoading || isProductsLoading || isSellerLoading;

  const displayFullName = sellerData?.business_name || "OmniQ Seller";
  const initial = displayFullName.charAt(0).toUpperCase();

  // Compute Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const activeOrders = sellerOrders.filter(o => o.status !== 'cancelled');
  
  const todayOrders = activeOrders.filter(o => new Date(o.created_at) >= today);
  const yesterdayOrders = activeOrders.filter(o => {
    const d = new Date(o.created_at);
    return d >= yesterday && d < today;
  });

  const revenueToday = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const revenueYesterday = yesterdayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  
  let revenueTrend = 0;
  if (revenueYesterday > 0) {
    revenueTrend = Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100);
  }
  
  const revenueTrendText = (revenueYesterday === 0 && revenueToday === 0) ? "No revenue yet" : 
                           (revenueYesterday === 0) ? "↑ 100% vs yesterday" :
                           revenueTrend >= 0 ? `↑ ${revenueTrend}% vs yesterday` : `↓ ${Math.abs(revenueTrend)}% vs yesterday`;

  const newOrdersToday = todayOrders.length;
  const newOrdersYesterday = yesterdayOrders.length;
  
  const ordersTrendText = (newOrdersYesterday === 0 && newOrdersToday === 0) ? "No orders yet" :
                          newOrdersToday >= newOrdersYesterday ? `↑ ${newOrdersToday - newOrdersYesterday} vs yesterday` : 
                          `↓ ${newOrdersYesterday - newOrdersToday} vs yesterday`;

  const liveProductsCount = products.filter(p => p.is_approved).length;

  // Chart Data
  // Get last 7 days including today
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dailyRevenue = last7Days.map(date => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const dayOrders = activeOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= date && d < nextDate;
    });
    return dayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  });

  // Calculate bar heights, minimum visible height of 4 so empty days still show a tiny tick
  const maxRevenue = Math.max(...dailyRevenue, 1);
  const normalizedBars = dailyRevenue.map(rev => Math.max((rev / maxRevenue) * 104, 4));
  const dayNames = last7Days.map(d => d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0));

  return (
    <>
      <Screen bottomNavItems={[
          { href: "/(seller)/dashboard" as any, icon: HomeIcon, label: "Home" },
          { href: "/(seller)/products" as any, icon: ListIcon, label: "Products" },
          { href: "/(seller)/seller-orders" as any, icon: BoxIcon, label: "Orders" },
          { href: "/(seller)/seller-profile" as any, icon: UserIcon, label: "Profile" }
        ]}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{displayFullName}</Text>
              </View>
              <Text style={styles.avatar}>{initial}</Text>
            </View>
            <View style={styles.kpiGrid}>
              <KpiCard label="REVENUE TODAY" value={formatCurrency(revenueToday)} trend={revenueTrendText} tone="gold" />
              <KpiCard label="NEW ORDERS" value={newOrdersToday.toString()} trend={ordersTrendText} />
              <KpiCard label="PRODUCTS LIVE" value={liveProductsCount.toString()} trend="Currently approved" tone="success" />
              <KpiCard label="AVG. RATING" value="N/A" trend="No reviews yet" tone="gold" />
            </View>
            <Card style={styles.chart}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Weekly Revenue</Text>
                <Text style={styles.segment}>7D</Text>
              </View>
              <View style={styles.bars}>
                {normalizedBars.map((height, index) => (
                  <View key={index} style={[styles.bar, { height }]} />
                ))}
              </View>
              <View style={styles.days}>
                {dayNames.map((day, index) => (
                  <Text key={`${day}-${index}`} style={styles.day}>{day}</Text>
                ))}
              </View>
            </Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <Link href="/(seller)/seller-orders" style={styles.link}>View all</Link>
            </View>
            
            {sellerOrders.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }}>No recent orders.</Text>
            ) : (
              sellerOrders.slice(0, 3).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </>
        )}
      </Screen>
      
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    marginTop: 10
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900"
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    lineHeight: 56,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    overflow: "hidden"
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  chart: {
    padding: 22,
    marginTop: 26,
    minHeight: 200
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chartTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900"
  },
  segment: {
    color: colors.textPrimary,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    overflow: "hidden",
    fontWeight: "900"
  },
  bars: {
    height: 104,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 18,
    marginTop: 24
  },
  bar: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 8
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14
  },
  day: {
    color: colors.textMuted
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 14
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: "900"
  },
  link: {
    color: colors.accentLight,
    fontWeight: "900"
  }
});
