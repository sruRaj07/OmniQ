import { StyleSheet, Text, View, Image, ActivityIndicator, Pressable } from "react-native";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useOrders } from "@/hooks/useOrders";
import { formatCurrency } from "@/utils/formatCurrency";
import { Link } from "expo-router";

export default function BuyerOrdersScreen() {
  const { buyerOrders, isLoading } = useOrders();
  
  return (
    <>
      <Screen bottomNavItems={[
          { href: "/(buyer)", icon: HomeIcon, label: "Home" },
          { href: "/(buyer)/cart", icon: ShoppingCartIcon, label: "Cart" },
          { href: "/(buyer)/orders", icon: BoxIcon, label: "Orders" },
          { href: "/(buyer)/profile", icon: UserIcon, label: "Profile" }
        ]}>
        <Text style={styles.title}>Orders</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : buyerOrders?.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>No orders found.</Text>
        ) : (
          buyerOrders.map((order: any) => {
            const amount = order.total || order.amount || 0;
            const createdAt = new Date(order.created_at || order.createdAt || Date.now());
            
            // Format date like "10th Jun 2026, 08:03 pm"
            const dateText = createdAt.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' });
            const timeText = createdAt.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }).toLowerCase();
            const placedText = `Placed at ${dateText}, ${timeText}`;
            
            const displayId = order.id.length > 8 ? `#OMQ-${order.id.split("-")[0].toUpperCase()}` : order.id;

            return (
              <Link key={order.id} href={`/order/${order.id}`} asChild>
                <Pressable style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View style={styles.statusRow}>
                        <Text style={styles.statusText}>Order {order.status}</Text>
                        <StatusBadge status={order.status} />
                      </View>
                      <Text style={styles.meta}>{placedText}</Text>
                    </View>
                    <Text style={styles.amount}>{formatCurrency(amount)}</Text>
                  </View>

                  <View style={styles.imagesRow}>
                    {order.order_items?.map((item: any, index: number) => {
                      if (index >= 5) return null; // Show max 5 images
                      const product = item.product;
                      const imageUrl = product?.images?.[0] || `https://picsum.photos/seed/${product?.id || item.product_id}/100`;
                      return (
                        <View key={item.id || index} style={styles.imageContainer}>
                          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                        </View>
                      );
                    })}
                    {order.order_items?.length > 5 && (
                      <View style={styles.moreItemsContainer}>
                        <Text style={styles.moreItemsText}>+{order.order_items.length - 5}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.actionRow}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </View>
                </Pressable>
              </Link>
            );
          })
        )}
      </Screen>
      
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
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  },
  imagesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  imageContainer: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border
  },
  image: {
    width: "100%",
    height: "100%"
  },
  moreItemsContainer: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  moreItemsText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 14
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    alignItems: "center"
  },
  viewDetailsText: {
    color: colors.accentLight,
    fontWeight: "700",
    fontSize: 14
  }
});
