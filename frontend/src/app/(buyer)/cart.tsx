/**
 * OmniQ mobile app - buyer cart screen.
 * Author: OmniQ Team
 */
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, Alert, ActivityIndicator, Modal, Pressable, ScrollView, TextInput } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from "react-native-reanimated";
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
import { FreeDeliveryProgress } from "@/components/buyer/FreeDeliveryProgress";
import { useAppTheme } from "@/store/useThemeStore";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatCurrency";
import { apiClient } from "@/lib/apiClient";
import { DELIVERY_FEE } from "@/constants/delivery";

type AddressField = "line1" | "line2" | "city" | "state" | "pincode" | "phone";
type DeliveryAddress = Record<AddressField, string>;
type AddressErrors = Partial<Record<AddressField, string>>;

// Indian pincodes are 6 digits and never start with 0. Mobile numbers are 10 digits starting 6-9.
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;
const MOBILE_PATTERN = /^[6-9][0-9]{9}$/;

/** Strips spaces/dashes and an optional +91 or leading 0 so buyers can type the number any way. */
function normalizeMobile(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Every field except line2 is mandatory; the order cannot be placed until all of these pass. */
function validateAddress(address: DeliveryAddress): AddressErrors {
  const errors: AddressErrors = {};

  const line1 = address.line1.trim();
  if (!line1) errors.line1 = "Address is required.";
  else if (line1.length < 5) errors.line1 = "Enter a complete address (at least 5 characters).";

  const city = address.city.trim();
  if (!city) errors.city = "City is required.";
  else if (city.length < 2) errors.city = "Enter a valid city.";

  const state = address.state.trim();
  if (!state) errors.state = "State is required.";
  else if (state.length < 2) errors.state = "Enter a valid state.";

  const pincode = address.pincode.trim();
  if (!pincode) errors.pincode = "Pincode is required.";
  else if (!PINCODE_PATTERN.test(pincode)) errors.pincode = "Enter a valid 6-digit pincode.";

  const phone = normalizeMobile(address.phone);
  if (!phone) errors.phone = "Mobile number is required.";
  else if (!MOBILE_PATTERN.test(phone)) errors.phone = "Enter a valid 10-digit mobile number.";

  return errors;
}

export default function CartScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const {
    items,
    subtotal,
    platformFee,
    deliveryFee,
    remainingForFreeDelivery,
    freeDeliveryThreshold,
    total,
    updateQuantity,
    removeItem,
    clearCart
  } = useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState<DeliveryAddress>({
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: ""
  });
  const [errors, setErrors] = useState<AddressErrors>({});
  const [serviceError, setServiceError] = useState<string | null>(null);
  // Remembers what the pincode lookup last filled in, so we only overwrite our own suggestion
  // and never clobber a city/state the buyer typed by hand.
  const autoFilledRef = useRef({ city: "", state: "" });
  // Fields the buyer has typed into. The profile prefill below re-runs on every refetch of
  // /users/me (queryClient sets refetchOnReconnect: "always", and placing an order invalidates
  // the key), and without this it would overwrite the buyer's fresh input with the stale profile
  // copy - the address they just corrected would silently revert while the modal was open.
  const touchedFieldsRef = useRef<Set<AddressField>>(new Set());

  const updateField = (field: AddressField, value: string) => {
    touchedFieldsRef.current.add(field);
    setAddress(prev => ({ ...prev, [field]: value }));
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await apiClient.get("/users/me");
      return res.data?.data;
    }
  });

  useEffect(() => {
    if (!profile) return;
    const touched = touchedFieldsRef.current;
    setAddress(prev => {
      const next = {
        ...prev,
        line1: touched.has("line1") ? prev.line1 : profile.address || prev.line1,
        pincode: touched.has("pincode") ? prev.pincode : profile.pincode || prev.pincode,
        phone: touched.has("phone") ? prev.phone : profile.phone_number || prev.phone
      };
      if (next.line1 === prev.line1 && next.pincode === prev.pincode && next.phone === prev.phone) return prev;
      return next;
    });
  }, [profile]);

  // City and State are not stored on the profile, so they arrive empty at checkout. Resolve them
  // from the pincode instead of asking the buyer to type what the pincode already implies.
  const trimmedPincode = address.pincode.trim();
  const { data: pincodeLocation } = useQuery({
    queryKey: ["pincodeLocation", trimmedPincode],
    enabled: PINCODE_PATTERN.test(trimmedPincode),
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get(`/location/pincode/${trimmedPincode}`);
      return res.data?.data as { city?: string; state?: string } | undefined;
    }
  });

  useEffect(() => {
    const city = pincodeLocation?.city;
    const state = pincodeLocation?.state;
    if (!city || !state) return;

    setAddress(prev => {
      const previous = autoFilledRef.current;
      const nextCity = !prev.city.trim() || prev.city === previous.city ? city : prev.city;
      const nextState = !prev.state.trim() || prev.state === previous.state ? state : prev.state;
      if (nextCity === prev.city && nextState === prev.state) return prev;
      return { ...prev, city: nextCity, state: nextState };
    });
    autoFilledRef.current = { city, state };
    setErrors(prev => (prev.city || prev.state ? { ...prev, city: undefined, state: undefined } : prev));
  }, [pincodeLocation]);

  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);
  const router = useRouter();

  const handleSuccessDone = () => {
    setShowSuccess(false);
    router.push("/(buyer)/orders");
  };

  const triggerSuccessAnimation = () => {
    setShowSuccess(true);
    opacityAnim.value = withTiming(1, { duration: 300 });
    scaleAnim.value = withSpring(1, { damping: 10, stiffness: 50 }, () => {
      setTimeout(() => {
        runOnJS(handleSuccessDone)();
      }, 2000);
    });
  };

  const successAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
    transform: [{ scale: scaleAnim.value }]
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value
  }));

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Please add some items to your cart first.");
      return;
    }
    setShowAddressModal(true);
  };

  const submitOrder = async () => {
    const validationErrors = validateAddress(address);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setServiceError(null);
      return;
    }

    // Send trimmed/normalized values, not the raw keystrokes, so the order record is clean.
    const deliveryAddress: DeliveryAddress = {
      line1: address.line1.trim(),
      line2: address.line2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
      phone: normalizeMobile(address.phone)
    };

    setIsPlacingOrder(true);

    // One key per checkout attempt. apiClient retries network errors and 5xx twice with backoff,
    // which on a weak mobile connection can replay a request the server already committed. The key
    // lets the server return the original order instead of creating a second one. It is generated
    // here rather than per-request so all retries of this attempt share it.
    const idempotencyKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

    try {
      // Step 1: Verify pincode serviceability
      const zoneCheckRes = await apiClient.post("/location/zone-check", { pincode: deliveryAddress.pincode });
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
        deliveryAddress,
        // No coordinates. This used to send a hardcoded Bangalore lat/lng for every buyer in the
        // country - fabricated data that nothing reads, and which would have obliged us to declare
        // precise location collection on the Play Data Safety form. Delivery routes off the
        // address and pincode above. Requires order-service with optional buyerLat/buyerLng.
        paymentMethod: "CASH_ON_DELIVERY"
      };
      await apiClient.post("/orders", payload, { headers: { "Idempotency-Key": idempotencyKey } });

      // Most buyers never open Account Information - this modal is the only place they ever type
      // an address, so what they confirm here is the freshest copy we hold. Mirror it back onto
      // the profile. Without this the profile row stays blank forever: the Account Information
      // card shows nothing, the next checkout has nothing to prefill, and admin - which reads the
      // buyer's name and phone from `profiles` - never sees the details this buyer actually gave.
      //
      // Deliberately non-fatal and deliberately after the order call: the order is already
      // committed, so a failed profile write must not surface to the buyer as a checkout failure.
      // Only line1 goes into `profiles.address` (the column is a single line, and the prefill
      // above reads it straight back into line1) - city/state/line2 live on the order itself.
      try {
        await apiClient.patch("/users/me", {
          phoneNumber: deliveryAddress.phone,
          address: deliveryAddress.line1,
          pincode: deliveryAddress.pincode
        });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      } catch (profileError) {
        console.warn("Order placed, but the profile could not be updated:", profileError);
      }

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
        
        {items.length === 0 ? <View style={styles.emptyState}>
            <AnimatedEmptyCart />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Looks like you haven't added anything yet.</Text>
            <Button style={{
          marginTop: 30
        }} onPress={() => router.push("/(buyer)")}>Start Shopping</Button>
          </View> : <>
            {items.map(item => <CartItem key={item.product.id} item={item} onIncrement={() => updateQuantity(item.product.id, item.quantity + 1)} onDecrement={() => updateQuantity(item.product.id, item.quantity - 1)} onRemove={() => removeItem(item.product.id)} />)}
            <Card style={[styles.summary, { padding: 12, marginBottom: 12, backgroundColor: 'rgba(0, 200, 83, 0.08)', borderColor: 'rgba(0, 200, 83, 0.2)', borderWidth: 1, flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>🚚</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13, marginBottom: 2 }}>Expected Day of Delivery</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                  {new Date().getHours() < 12 
                    ? "Today (12:00 PM – 7:00 PM)"
                    : "Tomorrow (12:00 PM – 7:00 PM)"}
                </Text>
              </View>
            </Card>

            <FreeDeliveryProgress subtotal={subtotal} remaining={remainingForFreeDelivery} threshold={freeDeliveryThreshold} />

            <Card style={styles.summary}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.row}><Text style={styles.label}>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</Text><Text style={styles.value}>{formatCurrency(subtotal)}</Text></View>
              <View style={styles.row}>
                <Text style={styles.label}>Delivery charges</Text>
                {deliveryFee > 0 ? (
                  <Text style={styles.value}>{formatCurrency(deliveryFee)}</Text>
                ) : (
                  <View style={styles.deliveryFreeGroup}>
                    <Text style={styles.strikePrice}>{formatCurrency(DELIVERY_FEE)}</Text>
                    <Text style={styles.free}>FREE</Text>
                  </View>
                )}
              </View>
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
          <Animated.View style={[styles.successCircle, successAnimatedStyle]}>
            <Text style={styles.successIcon}>✓</Text>
          </Animated.View>
          <Animated.Text style={[styles.successText, textAnimatedStyle]}>Order Placed Successfully!</Animated.Text>
        </View>
      </Modal>

      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView
            style={styles.addressModalScroll}
            contentContainerStyle={styles.addressModal}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>Confirm Delivery Address</Text>
            
            <Text style={styles.inputLabel}>Address Line 1 *</Text>
            <TextInput
              style={[styles.input, errors.line1 ? styles.inputError : null]}
              value={address.line1}
              onChangeText={(text) => updateField("line1", text)}
            />
            {errors.line1 ? <Text style={styles.fieldError}>{errors.line1}</Text> : null}

            <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
            <TextInput style={styles.input} value={address.line2} onChangeText={(text) => updateField("line2", text)} />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.input, errors.city ? styles.inputError : null]}
                  value={address.city}
                  onChangeText={(text) => updateField("city", text)}
                />
                {errors.city ? <Text style={styles.fieldError}>{errors.city}</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={[styles.input, errors.state ? styles.inputError : null]}
                  value={address.state}
                  onChangeText={(text) => updateField("state", text)}
                />
                {errors.state ? <Text style={styles.fieldError}>{errors.state}</Text> : null}
              </View>
            </View>

            <Text style={styles.inputLabel}>Pincode *</Text>
            <TextInput
              style={[styles.input, errors.pincode ? styles.inputError : null]}
              value={address.pincode}
              keyboardType="numeric"
              maxLength={6}
              onChangeText={(text) => {
                updateField("pincode", text.replace(/[^0-9]/g, ""));
                setServiceError(null);
              }}
            />
            {errors.pincode ? <Text style={styles.fieldError}>{errors.pincode}</Text> : null}

            <Text style={styles.inputLabel}>Mobile Number *</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              value={address.phone}
              keyboardType="phone-pad"
              maxLength={13}
              onChangeText={(text) => updateField("phone", text)}
            />
            {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

            {serviceError ? (
              <Text style={{ color: colors.danger, fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: 'bold' }}>
                {serviceError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Button variant="secondary" style={styles.modalCancel} onPress={() => setShowAddressModal(false)}>
                Cancel
              </Button>
              <Pressable style={styles.modalConfirm} onPress={submitOrder} disabled={isPlacingOrder}>
                <Text style={styles.orderText}>{isPlacingOrder ? "Processing..." : "Confirm"}</Text>
              </Pressable>
            </View>
          </ScrollView>
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
  deliveryFreeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  strikePrice: {
    color: colors.textMuted,
    fontSize: 14,
    textDecorationLine: "line-through"
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
  addressModalScroll: {
    flexGrow: 0,
    maxHeight: "85%",
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  addressModal: {
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
  inputError: {
    borderColor: colors.danger
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4
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