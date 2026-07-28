import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { useOrders } from "@/hooks/useOrders";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/utils/formatCurrency";
import { Image } from "expo-image";
export default function OrderDetailsScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const {
    id
  } = useLocalSearchParams();
  const router = useRouter();
  const {
    buyerOrders,
    isLoading
  } = useOrders();
  const order = buyerOrders?.find((o: any) => o.id === id);
  if (isLoading) {
    return <Screen>
        <ActivityIndicator size="large" color={colors.accent} style={{
        marginTop: 40
      }} />
      </Screen>;
  }
  if (!order) {
    return <Screen>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/(buyer)/orders")}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={{
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 40
      }}>Order not found.</Text>
      </Screen>;
  }
  const createdAt = new Date(order.created_at || order.createdAt || Date.now());
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
  const subtotal = order.subtotal || order.order_items?.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || 0), 0) || 0;
  const platformFee = order.platform_fee || 29;
  const total = order.total || order.amount || subtotal + platformFee;
  return <Screen scroll={true}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/(buyer)/orders")}>
        <Text style={styles.backText}>← Back to Orders</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Order Summary</Text>
      
      <View style={styles.headerCard}>
        <View style={styles.orderMetaContainer}>
          <View style={styles.orderMetaColumn}>
            <Text style={styles.orderMetaLabel}>Order date</Text>
            <Text style={styles.orderMetaValue}>{dateText}</Text>
          </View>
          <View style={styles.orderMetaColumn}>
            <Text style={styles.orderMetaLabel}>Order #</Text>
            <Text style={styles.orderMetaValue}>{displayId}</Text>
          </View>
          <View style={styles.orderMetaColumn}>
            <Text style={styles.orderMetaLabel}>Order total</Text>
            <Text style={styles.orderMetaValue}>{formatCurrency(total)}</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          {["Ordered", "On the way", "Delivered"].map((step, index) => {
            const statusLevels: Record<string, number> = {
              pending: 0,
              processing: 0,
              shipped: 1,
              out_for_delivery: 1,
              delivered: 2
            };
            let currentLevel = statusLevels[order.status?.toLowerCase()] ?? 0;
            
            // Automatically advance to 'On the way' if 1 hour has passed since creation
            const ONE_HOUR_MS = 60 * 60 * 1000;
            if (currentLevel === 0 && (Date.now() - createdAt.getTime()) > ONE_HOUR_MS) {
              currentLevel = 1;
            }

            const isActive = index <= currentLevel;
            const isLast = index === 2;

            return (
              <View key={step} style={styles.progressStep}>
                <View style={[styles.progressDot, isActive && styles.progressDotActive]} />
                <Text style={[styles.progressText, isActive && styles.progressTextActive]}>{step}</Text>
                {!isLast && <View style={[styles.progressLine, currentLevel > index && styles.progressLineActive]} />}
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Items Ordered</Text>
      <View style={styles.itemsCard}>
        {order.order_items?.map((item: any, index: number) => {
        const product = item.product;
        const productTitle = product?.title || "Unknown Product";
        const imageUrl = product?.images?.[0] || `https://picsum.photos/seed/${product?.id || item.product_id}/100`;
        const itemSubtotal = item.subtotal || item.quantity * (item.unit_price || 0);
        return <View key={item.id || index} style={[styles.itemRow, index !== order.order_items.length - 1 && styles.itemBorder]}>
              <View style={styles.itemImageContainer}>
                <Image source={{
              uri: imageUrl
            }} style={styles.itemImage} contentFit="cover" transition={150} />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{productTitle}</Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(itemSubtotal)}</Text>
            </View>;
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



    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
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
    fontWeight: "800",
    marginBottom: 20
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  orderMetaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
    marginBottom: 4
  },
  orderMetaColumn: {
    flex: 1
  },
  orderMetaLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4
  },
  orderMetaValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 4
  },
  itemsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12
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
    marginBottom: 24
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  invoiceLabel: {
    color: colors.textSecondary,
    fontSize: 13
  },
  invoiceValue: {
    color: colors.textPrimary,
    fontSize: 13,
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
    fontWeight: "700"
  },
  invoiceTotalValue: {
    color: colors.success,
    fontSize: 18,
    fontWeight: "800"
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 40
  },
  addressName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8
  },
  addressText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 20
  },
  progressContainer: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8
  },
  progressStep: {
    alignItems: "center",
    flex: 1,
    position: "relative"
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bgTertiary,
    zIndex: 2,
    borderWidth: 2,
    borderColor: colors.border
  },
  progressDotActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  progressText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    fontWeight: "600",
    textAlign: "center"
  },
  progressTextActive: {
    color: colors.success,
    fontWeight: "700"
  },
  progressLine: {
    position: "absolute",
    top: 6,
    left: "50%",
    width: "100%",
    height: 3,
    backgroundColor: colors.border,
    zIndex: 1
  },
  progressLineActive: {
    backgroundColor: colors.success
  }
});