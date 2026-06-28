/**
 * OmniQ mobile app - buyer order history.
 * Author: OmniQ Team
 */
import { StyleSheet, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useOrders } from "@/hooks/useOrders";
import { formatCurrency } from "@/utils/formatCurrency";

export default function BuyerOrdersScreen() {
  const { buyerOrders } = useOrders();
  return (
    <>
      <Screen>
        <Text style={styles.title}>Orders</Text>
        {buyerOrders.map((order) => (
          <Card key={order.id} style={styles.card}>
            <Text style={styles.id}>{order.id}</Text>
            <Text style={styles.name}>{order.productTitle}</Text>
            <Text style={styles.meta}>{order.seller} · {order.createdAt}</Text>
            <Text style={styles.amount}>{formatCurrency(order.amount)}</Text>
            <StatusBadge status={order.status} />
          </Card>
        ))}
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(buyer)", icon: "🏠", label: "Home" },
          { href: "/(buyer)/explore", icon: "🔎", label: "Explore" },
          { href: "/(buyer)/cart", icon: "🛒", label: "Cart" },
          { href: "/(buyer)/orders", icon: "📦", label: "Orders" },
          { href: "/(buyer)/profile", icon: "👤", label: "Profile" }
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 18
  },
  card: {
    padding: 18,
    marginBottom: 14,
    gap: 7
  },
  id: {
    color: colors.textSecondary,
    fontWeight: "900"
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  },
  meta: {
    color: colors.textMuted
  },
  amount: {
    color: colors.goldLight,
    fontSize: 20,
    fontWeight: "900"
  }
});
