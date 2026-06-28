/**
 * OmniQ mobile app - buyer cart screen.
 * Author: OmniQ Team
 */
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { CartItem } from "@/components/buyer/CartItem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";

export default function CartScreen() {
  const { items, subtotal, platformFee, total, updateQuantity, removeItem } = useCart();
  return (
    <>
      <Screen>
        <View style={styles.header}>
          <Link href="/(buyer)" style={styles.back}>←</Link>
          <Text style={styles.title}>My Cart</Text>
          <Text style={styles.count}>{items.length} items</Text>
        </View>
        {items.map((item) => (
          <CartItem
            key={item.product.id}
            item={item}
            onIncrement={() => updateQuantity(item.product.id, item.quantity + 1)}
            onDecrement={() => updateQuantity(item.product.id, item.quantity - 1)}
            onRemove={() => removeItem(item.product.id)}
          />
        ))}
        <View style={styles.promo}>
          <Text style={styles.promoText}>🏷 Apply promo code</Text>
        </View>
        <Card style={styles.summary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.row}><Text style={styles.label}>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</Text><Text style={styles.value}>{formatCurrency(subtotal)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Delivery charges</Text><Text style={styles.free}>FREE</Text></View>
          <View style={styles.row}><Text style={styles.label}>Platform fee</Text><Text style={styles.value}>{formatCurrency(platformFee)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{formatCurrency(total)}</Text></View>
        </Card>
        <Button style={styles.order}>Place Order — {formatCurrency(total)} →</Button>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24
  },
  back: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "900",
    flex: 1
  },
  count: {
    color: colors.textPrimary,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: "hidden",
    fontWeight: "900"
  },
  promo: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 20,
    marginTop: 8,
    marginBottom: 20
  },
  promoText: {
    color: colors.accentLight,
    fontSize: 18,
    fontWeight: "800"
  },
  summary: {
    padding: 22,
    gap: 10
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: colors.textSecondary,
    fontSize: 17
  },
  value: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "900"
  },
  free: {
    color: colors.success,
    fontSize: 17,
    fontWeight: "900"
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4
  },
  totalLabel: {
    color: colors.goldLight,
    fontSize: 20,
    fontWeight: "900"
  },
  total: {
    color: colors.goldLight,
    fontSize: 20,
    fontWeight: "900"
  },
  order: {
    marginTop: 20
  }
});
