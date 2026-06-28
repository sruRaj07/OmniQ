/**
 * OmniQ mobile app - seller dashboard.
 * Author: OmniQ Team
 */
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { KpiCard } from "@/components/seller/KpiCard";
import { OrderCard } from "@/components/seller/OrderCard";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useOrders } from "@/hooks/useOrders";

export default function SellerDashboardScreen() {
  const { sellerOrders } = useOrders();
  return (
    <>
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.portal}>Seller Portal 🏪</Text>
            <Text style={styles.title}>SportZone India</Text>
          </View>
          <Text style={styles.avatar}>S</Text>
        </View>
        <View style={styles.kpiGrid}>
          <KpiCard label="REVENUE TODAY" value="₹14,280" trend="↑ 12% vs yesterday" tone="gold" />
          <KpiCard label="NEW ORDERS" value="24" trend="↑ 8 since morning" />
          <KpiCard label="PRODUCTS LIVE" value="48" trend="↑ 2 added today" tone="success" />
          <KpiCard label="AVG. RATING" value="4.9 ★" trend="Based on 284 reviews" tone="gold" />
        </View>
        <Card style={styles.chart}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Revenue</Text>
            <Text style={styles.segment}>7D</Text>
          </View>
          <View style={styles.bars}>
            {[50, 72, 46, 82, 60, 92, 68].map((height, index) => (
              <View key={index} style={[styles.bar, { height }]} />
            ))}
          </View>
          <View style={styles.days}>
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.day}>{day}</Text>
            ))}
          </View>
        </Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Link href="/(seller)/orders" style={styles.link}>View all</Link>
        </View>
        {sellerOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(seller)/dashboard", icon: "🏠", label: "Home" },
          { href: "/(seller)/products", icon: "🏷", label: "Products" },
          { href: "/(seller)/orders", icon: "📦", label: "Orders" },
          { href: "/(seller)/profile", icon: "👤", label: "Profile" }
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22
  },
  portal: {
    color: colors.textSecondary,
    fontSize: 16
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
