/**
 * OmniQ mobile app - seller incoming orders.
 * Author: OmniQ Team
 */
import { StyleSheet, Text } from "react-native";
import { OrderCard } from "@/components/seller/OrderCard";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useOrders } from "@/hooks/useOrders";

export default function SellerOrdersScreen() {
  const { sellerOrders } = useOrders();
  return (
    <>
      <Screen>
        <Text style={styles.title}>Incoming Orders</Text>
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
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 18
  }
});
