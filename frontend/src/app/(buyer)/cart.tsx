/**
 * OmniQ mobile app - buyer cart screen.
 * Author: OmniQ Team
 */
import { useState, useRef } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, Alert, ActivityIndicator, Modal, Animated } from "react-native";
import { CartItem } from "@/components/buyer/CartItem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { Screen } from "@/components/shared/Screen";
import { AnimatedEmptyCart } from "@/components/buyer/AnimatedEmptyCart";
import { colors } from "@/constants/colors";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";
import { apiClient } from "@/lib/apiClient";

export default function CartScreen() {
  const { items, subtotal, platformFee, total, updateQuantity, removeItem, clearCart } = useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const triggerSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      })
    ]).start(() => {
      setTimeout(() => {
        setShowSuccess(false);
        router.push("/(buyer)/orders");
      }, 2000);
    });
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Please add some items to your cart first.");
      return;
    }
    
    setIsPlacingOrder(true);
    try {
      const payload = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        deliveryAddress: {
          line1: "Flat 402, Royal Residency",
          line2: "Koramangala 3rd Block",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560034"
        },
        buyerLat: 12.9348,
        buyerLng: 77.6220,
        paymentMethod: "CASH_ON_DELIVERY"
      };

      await apiClient.post("/orders", payload);
      
      clearCart();
      triggerSuccessAnimation();
    } catch (error: any) {
      console.error("Failed to place order:", error);
      Alert.alert("Checkout Failed", error?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <>
      <Screen>
        <View style={styles.header}>
          <Link href="/(buyer)" style={styles.back}>←</Link>
          <Text style={styles.title}>My Cart</Text>
          <Text style={styles.count}>{items.length} items</Text>
        </View>
        
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <AnimatedEmptyCart />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Looks like you haven't added anything yet.</Text>
            <Button style={{ marginTop: 30 }} onPress={() => router.push("/(buyer)")}>Start Shopping</Button>
          </View>
        ) : (
          <>
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
            <Button style={styles.order} onPress={handlePlaceOrder} disabled={isPlacingOrder}>
              {isPlacingOrder ? "Processing..." : `Place Order — ${formatCurrency(total)} →`}
            </Button>
          </>
        )}
      </Screen>

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.successCircle, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.successIcon}>✓</Text>
          </Animated.View>
          <Animated.Text style={[styles.successText, { opacity: opacityAnim }]}>Order Placed Successfully!</Animated.Text>
        </View>
      </Modal>

      <BottomNavBar
        items={[
          { href: "/(buyer)", icon: HomeIcon, label: "" },
          { href: "/(buyer)/cart", icon: ShoppingCartIcon, label: "" },
          { href: "/(buyer)/orders", icon: BoxIcon, label: "" },
          { href: "/(buyer)/profile", icon: UserIcon, label: "" }
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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center"
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  successIcon: {
    color: "#FFF",
    fontSize: 50,
    fontWeight: "bold"
  },
  successText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  emptySubtitle: {
    color: colors.textMuted,
    marginTop: 8,
    fontSize: 14,
  },
});
