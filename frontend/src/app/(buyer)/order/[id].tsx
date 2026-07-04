import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useOrders } from "@/hooks/useOrders";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/utils/formatCurrency";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { buyerOrders, isLoading } = useOrders();

  const order = buyerOrders?.find((o: any) => o.id === id);

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Order not found.</Text>
      </Screen>
    );
  }

  const createdAt = new Date(order.created_at || order.createdAt || Date.now());
  const dateText = createdAt.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' });
  const timeText = createdAt.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }).toLowerCase();
  const placedText = `Placed at ${dateText}, ${timeText}`;
  const displayId = order.id.length > 8 ? `#OMQ-${order.id.split("-")[0].toUpperCase()}` : order.id;

  const subtotal = order.subtotal || order.order_items?.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || 0), 0) || 0;
  const platformFee = order.platform_fee || 29;
  const total = order.total || order.amount || (subtotal + platformFee);

  return (
    <Screen scroll={true}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back to Orders</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Order Summary</Text>
      
      <View style={styles.headerCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Order {order.status}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text style={styles.meta}>{placedText}</Text>
        <Text style={styles.orderId}>{displayId}</Text>
      </View>

      <Text style={styles.sectionTitle}>Items Ordered</Text>
      <View style={styles.itemsCard}>
        {order.order_items?.map((item: any, index: number) => {
          const product = item.product;
          const productTitle = product?.title || "Unknown Product";
          const imageUrl = product?.images?.[0] || `https://picsum.photos/seed/${product?.id || item.product_id}/100`;
          const itemSubtotal = item.subtotal || (item.quantity * (item.unit_price || 0));

          return (
            <View key={item.id || index} style={[styles.itemRow, index !== order.order_items.length - 1 && styles.itemBorder]}>
              <View style={styles.itemImageContainer}>
                <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{productTitle}</Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(itemSubtotal)}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Invoice details</Text>
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Item Total</Text>
          <Text style={styles.invoiceValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Platform Fee</Text>
          <Text style={styles.invoiceValue}>{formatCurrency(platformFee)}</Text>
        </View>
        <View style={[styles.invoiceRow, styles.invoiceTotalRow]}>
          <Text style={styles.invoiceTotalLabel}>Grand Total</Text>
          <Text style={styles.invoiceTotalValue}>{formatCurrency(total)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Delivery Address</Text>
      <View style={styles.addressCard}>
        {order.delivery_address ? (
          <>
            <Text style={styles.addressName}>{order.delivery_address.fullName}</Text>
            <Text style={styles.addressText}>{order.delivery_address.address}</Text>
            <Text style={styles.addressText}>Pincode: {order.delivery_address.pincode}</Text>
            <Text style={styles.addressText}>Phone: {order.delivery_address.phoneNumber}</Text>
          </>
        ) : (
          <Text style={styles.addressText}>No delivery address saved with this order.</Text>
        )}
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginBottom: 16,
    paddingVertical: 8
  },
  backText: {
    color: colors.accentLight,
    fontWeight: "700",
    fontSize: 16
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 12
  },
  orderId: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    marginLeft: 4
  },
  itemsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  itemImage: {
    width: "100%",
    height: "100%"
  },
  itemDetails: {
    flex: 1,
    justifyContent: "center"
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4
  },
  itemQuantity: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500"
  },
  itemPrice: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  invoiceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  invoiceLabel: {
    color: colors.textSecondary,
    fontSize: 14
  },
  invoiceValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  invoiceTotalRow: {
    marginTop: 4,
    marginBottom: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  invoiceTotalLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  invoiceTotalValue: {
    color: colors.success,
    fontSize: 18,
    fontWeight: "900"
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 40,
  },
  addressName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8
  },
  addressText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20
  }
});
