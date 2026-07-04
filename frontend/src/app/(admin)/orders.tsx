/**
 * OmniQ mobile app - admin orders screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Screen } from "@/components/shared/Screen";
import { BarIcon } from "@/components/ui/BarIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";

export default function AdminOrdersScreen() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: async () => {
      const res = await apiClient.get("/orders"); // Order service
      return res.data.data;
    },
  });

  return (
    <>
      <Screen scroll>
        <Text style={styles.title}>All Orders</Text>
        <Text style={styles.subtitle}>Platform-wide transaction feed</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : orders?.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No orders found.</Text>
        ) : (
          <View style={styles.list}>
            {orders?.map((order: any) => (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>{order.id.substring(0, 8).toUpperCase()}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{order.status}</Text>
                  </View>
                </View>
                <Text style={styles.mutedText}>Buyer: {order.buyer_id?.substring(0, 8) || "Unknown"}</Text>
                <Text style={styles.mutedText}>Seller: {order.seller_id?.substring(0, 8) || "Unknown"}</Text>
                <View style={styles.footer}>
                  <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString()}</Text>
                  <Text style={styles.price}>₹{order.total?.toLocaleString("en-IN")}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(admin)", icon: BarIcon, label: "" },
          { href: "/(admin)/sellers", icon: UsersIcon, label: "" },
          { href: "/(admin)/moderation", icon: FlagIcon, label: "" },
          { href: "/(admin)/zones", icon: GlobeIcon, label: "" },
          { href: "/(admin)/orders", icon: BoxIcon, label: "" }
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 20
  },
  list: {
    gap: 16
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  orderId: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(108, 99, 255, 0.2)"
  },
  badgeText: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  date: {
    color: colors.textMuted,
    fontSize: 14
  },
  price: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  }
});
