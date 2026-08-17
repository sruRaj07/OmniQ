import { StyleSheet, Text, View, ActivityIndicator, Pressable, Alert, Modal, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from "react-native-reanimated";
import { useState } from "react";
import { Image } from "expo-image";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { MenuIcon } from "@/components/ui/MenuIcon";
import { Screen } from "@/components/shared/Screen";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { useAppTheme } from "@/store/useThemeStore";
import { useOrders } from "@/hooks/useOrders";
import { sizedImageUrl } from "@/utils/imageUrl";
import { formatCurrency } from "@/utils/formatCurrency";
import { orderTotalOf } from "@/constants/delivery";
import { Link } from "expo-router";
export default function BuyerOrdersScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const {
    buyerOrders,
    isLoading,
    cancelOrder,
    isCancelling
  } = useOrders();

  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);

  const handleSuccessDone = () => {
    setShowSuccess(false);
    // Reset animations for future cancellations
    scaleAnim.value = 0;
    opacityAnim.value = 0;
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

  const handleCancelOrder = async (orderId: string) => {
    const executeCancel = async () => {
      try {
        await cancelOrder(orderId);
        triggerSuccessAnimation();
      } catch (err: any) {
        if (Platform.OS === 'web') {
          window.alert(err.response?.data?.error?.message || err.message);
        } else {
          Alert.alert("Error", err.response?.data?.error?.message || err.message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to cancel this order?")) {
        await executeCancel();
      }
    } else {
      Alert.alert(
        "Cancel Order",
        "Are you sure you want to cancel this order?",
        [
          { text: "No", style: "cancel" },
          { 
            text: "Yes, Cancel", 
            style: "destructive", 
            onPress: executeCancel
          }
        ]
      );
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
        <Text style={styles.title}>Orders</Text>
        {isLoading ? <ActivityIndicator size="large" color={colors.accent} style={{
        marginTop: 40
      }} /> : buyerOrders?.length === 0 ? <Text style={{
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 40
      }}>No orders found.</Text> : buyerOrders.map((order: any) => {
        const amount = orderTotalOf(order);
        const createdAt = new Date(order.created_at || order.createdAt || Date.now());

        // Format date like "10th Jun 2026, 08:03 pm"
        const dateText = createdAt.toLocaleDateString("en-US", {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const timeText = createdAt.toLocaleTimeString("en-US", {
          hour: '2-digit',
          minute: '2-digit'
        }).toLowerCase();
        const placedText = `Placed at ${dateText}, ${timeText}`;
        const displayId = order.id.length > 8 ? `#OMQ-${order.id.split("-")[0].toUpperCase()}` : order.id;
        const hour = createdAt.getHours();
        const deliveryStart = new Date(createdAt);
        deliveryStart.setHours(12, 0, 0, 0);
        if (hour >= 12) {
          deliveryStart.setDate(deliveryStart.getDate() + 1);
        }
        const cutoffTime = new Date(deliveryStart.getTime() - 12 * 60 * 60 * 1000);
        const canCancel = order.status === "pending" && Date.now() < cutoffTime.getTime();

        return <View key={order.id} style={styles.card}>
                <Link href={`/order/${order.id}`} asChild>
                  <Pressable>
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
                  return <View key={item.id || index} style={styles.imageContainer}>
                            {/* ⚡ PERFORMANCE: these render at 52dp, up to five per order. Left
                                unsized they pulled the full-resolution original for each one. */}
                            <Image source={sizedImageUrl(imageUrl, { width: 160, quality: 60 })} style={styles.image} contentFit="cover" transition={150} />
                          </View>;
                })}
                      {order.order_items?.length > 5 && <View style={styles.moreItemsContainer}>
                          <Text style={styles.moreItemsText}>+{order.order_items.length - 5}</Text>
                        </View>}
                    </View>
                  </Pressable>
                </Link>
                  
                <View style={styles.actionRow}>
                  {canCancel && (
                    <Pressable 
                      style={styles.cancelButton}
                      onPress={() => handleCancelOrder(order.id)}
                      disabled={isCancelling}
                    >
                      <Text style={styles.cancelButtonText}>{isCancelling ? 'Cancelling...' : 'Cancel Order'}</Text>
                    </Pressable>
                  )}
                  <Link href={`/order/${order.id}`} asChild>
                    <Pressable style={styles.viewDetailsButton}>
                      <Text style={styles.viewDetailsText}>View Details</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>;
      })}
      </Screen>

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.successCircle, successAnimatedStyle]}>
            <Text style={styles.successIcon}>✓</Text>
          </Animated.View>
          <Animated.Text style={[styles.successText, textAnimatedStyle]}>Order Cancelled Successfully!</Animated.Text>
        </View>
      </Modal>
      
    </>;
}
const getStyles = (colors: any) => StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 18
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 4px 10px rgba(0,0,0,0.15)",
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
    fontWeight: "700",
    textTransform: "capitalize"
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 11
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
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
    fontSize: 13
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  viewDetailsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewDetailsText: {
    color: colors.accentLight,
    fontWeight: "700",
    fontSize: 13
  }
});