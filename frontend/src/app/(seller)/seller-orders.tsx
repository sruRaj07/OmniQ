/**
 * OmniQ mobile app - seller incoming orders.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, ActivityIndicator, View } from "react-native";
import { OrderCard } from "@/components/seller/OrderCard";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useOrders } from "@/hooks/useOrders";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";

export default function SellerOrdersScreen() {
  const { sellerOrders, isLoading } = useOrders();
  return (
    <>
      <Screen>
        <Text style={styles.title}>Incoming Orders</Text>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sellerOrders.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>No orders yet.</Text>
        ) : (
          sellerOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(seller)/dashboard" as any, icon: HomeIcon, label: "" },
          { href: "/(seller)/products" as any, icon: ListIcon, label: "" },
          { href: "/(seller)/seller-orders" as any, icon: BoxIcon, label: "" },
          { href: "/(seller)/seller-profile" as any, icon: UserIcon, label: "" }
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
