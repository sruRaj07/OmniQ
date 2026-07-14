/**
 * OmniQ mobile app - buyer cart screen.
 * Author: OmniQ Team
 */
import { useState, useRef } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, Alert, ActivityIndicator, Modal, Animated, Pressable, TextInput } from "react-native";
import { CartItem } from "@/components/buyer/CartItem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { MenuIcon } from "@/components/ui/MenuIcon";
import { Screen } from "@/components/shared/Screen";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { AnimatedEmptyCart } from "@/components/buyer/AnimatedEmptyCart";
import { useAppTheme } from "@/store/useThemeStore";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";
import { apiClient } from "@/lib/apiClient";
export default function CartScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const {
    items,
    subtotal,
    platformFee,
    total,
    updateQuantity,
    removeItem,
    clearCart
  } = useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState({
    line1: "Flat 402, Royal Residency",
    line2: "Koramangala 3rd Block",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    phone: "8710031657"
  });
  const [serviceError, setServiceError] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const triggerSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.parallel([Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }), Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true
    })]).start(() => {
      setTimeout(() => {
        setShowSuccess(false);
        router.push("/(buyer)/orders");
      }, 2000);
    });
  };
  const handlePlaceOrder = () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Please add some items to your cart first.");
      return;
    }
    setShowAddressModal(true);
  };

  const submitOrder = async () => {
    if (!address.pincode) {
      Alert.alert("Missing Pincode", "Please enter a pincode.");
      return;
    }
    
    setIsPlacingOrder(true);
    
    try {
      // Step 1: Verify pincode serviceability
      const zoneCheckRes = await apiClient.post("/location/zone-check", { pincode: address.pincode });
      const zoneData = zoneCheckRes.data?.data || zoneCheckRes.data;
      
      if (zoneData && zoneData.isServiceable === false) {
        setIsPlacingOrder(false);
        setServiceError("Sorry, we do not deliver to this pincode at the moment.");
        return;
      }
      
      // Step 2: Proceed with order creation
      setShowAddressModal(false);
      const payload = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        deliveryAddress: address,
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
  return <>
      <Screen header={<BuyerHeader />} bottomNavItems={[{
      href: "/(buyer)",
      icon: HomeIcon,
      label: "Home"
    }, {
      href: "/(buyer)/cart",
      icon: ShoppingCartIcon,
      label: "Cart"
    }, {
      href: "/(buyer)/browse",
      icon: MenuIcon,
      label: "Browse"
    }, {
      href: "/(buyer)/orders",
      icon: BoxIcon,
      label: "Orders"
    }, {
      href: "/(buyer)/profile",
      icon: UserIcon,
      label: "Profile"
    }]}>
        <View style={styles.header}>
          <Link href="/(buyer)" style={styles.back}>←</Link>
          <Text style={styles.title}>My Cart</Text>
          <Text style={styles.count}>{items.length} items</Text>
        </View>
        
        {items.length === 0 ? <View style={styles.emptyState}>
            <AnimatedEmptyCart />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Looks like you haven't added anything yet.</Text>
            <Button style={{
          marginTop: 30
        }} onPress={() => router.push("/(buyer)")}>Start Shopping</Button>
          </View> : <>
            {items.map(item => <CartItem key={item.product.id} item={item} onIncrement={() => updateQuantity(item.product.id, item.quantity + 1)} onDecrement={() => updateQuantity(item.product.id, item.quantity - 1)} onRemove={() => removeItem(item.product.id)} />)}
            <Card style={styles.summary}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.row}><Text style={styles.label}>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</Text><Text style={styles.value}>{formatCurrency(subtotal)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Delivery charges</Text><Text style={styles.free}>FREE</Text></View>
              <View style={styles.divider} />
              <View style={styles.row}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{formatCurrency(total)}</Text></View>
            </Card>
            <Pressable style={styles.order} onPress={handlePlaceOrder} disabled={isPlacingOrder}>
              <Text style={styles.orderText}>
                {isPlacingOrder ? "Processing..." : `Place Order — ${formatCurrency(total)}`}
              </Text>
            </Pressable>
          </>}
      </Screen>

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.successCircle, {
          opacity: opacityAnim,
          transform: [{
            scale: scaleAnim
          }]
        }]}>
            <Text style={styles.successIcon}>✓</Text>
          </Animated.View>
          <Animated.Text style={[styles.successText, {
          opacity: opacityAnim
        }]}>Order Placed Successfully!</Animated.Text>
        </View>
      </Modal>

      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.addressModal}>
            <Text style={styles.modalTitle}>Confirm Delivery Address</Text>
            
            <Text style={styles.inputLabel}>Address Line 1</Text>
            <TextInput style={styles.input} value={address.line1} onChangeText={(text) => setAddress({...address, line1: text})} />
            
            <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
            <TextInput style={styles.input} value={address.line2} onChangeText={(text) => setAddress({...address, line2: text})} />
            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput style={styles.input} value={address.city} onChangeText={(text) => setAddress({...address, city: text})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput style={styles.input} value={address.state} onChangeText={(text) => setAddress({...address, state: text})} />
              </View>
            </View>
            
            <Text style={styles.inputLabel}>Pincode</Text>
            <TextInput style={styles.input} value={address.pincode} keyboardType="numeric" onChangeText={(text) => {
              setAddress({...address, pincode: text});
              setServiceError(null);
            }} />
            
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <TextInput style={styles.input} value={address.phone} keyboardType="phone-pad" onChangeText={(text) => setAddress({...address, phone: text})} />

            {serviceError ? (
              <Text style={{ color: colors.danger, fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: 'bold' }}>
                {serviceError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Button style={styles.modalCancel} onPress={() => setShowAddressModal(false)}>
                Cancel
              </Button>
              <Pressable style={styles.modalConfirm} onPress={submitOrder} disabled={isPlacingOrder}>
                <Text style={styles.orderText}>{isPlacingOrder ? "Processing..." : "Confirm"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      
    </>;
}
const getStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24
  },
  back: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    flex: 1
  },
  count: {
    color: colors.textPrimary,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: "hidden",
    fontWeight: "800"
  },
  promo: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center"
  },
  promoText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  summary: {
    padding: 20,
    gap: 12,
    borderRadius: 8,
    backgroundColor: colors.card
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: colors.textSecondary,
    fontSize: 15
  },
  value: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  free: {
    color: colors.success,
    fontSize: 15,
    fontWeight: "700"
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4
  },
  totalLabel: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800"
  },
  total: {
    color: colors.goldLight,
    fontSize: 22,
    fontWeight: "800"
  },
  order: {
    marginTop: 20,
    backgroundColor: "#FFD814",
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  orderText: {
    color: "#0F1111",
    fontSize: 16,
    fontWeight: "700"
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end"
  },
  addressModal: {
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30
  },
  modalCancel: {
    flex: 1,
    backgroundColor: colors.card2
  },
  modalConfirm: {
    flex: 2,
    backgroundColor: "#FFD814",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
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
    fontSize: 28,
    fontWeight: "bold"
  },
  successText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "bold"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8
  },
  emptySubtitle: {
    color: colors.textMuted,
    marginTop: 8,
    fontSize: 13
  }
});