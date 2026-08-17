/**
 * OmniQ mobile app - admin orders screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Screen } from "@/components/shared/Screen";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";
import { orderSubtotalOf, resolveOrderDeliveryFee } from "@/constants/delivery";
import { useRefreshControl } from "@/hooks/useRefreshControl";

export default function AdminOrdersScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  // Pull-to-refresh for this list. `Screen` owns it for scrolling screens; this one
  // passes scroll={false}, so the list attaches it itself.
  const refreshControl = useRefreshControl();
  const [activeTab, setActiveTab] = useState<'new' | 'delivered'>('new');

  const { data: orders, isLoading } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/orders");
      return res.data.data;
    }
  }, queryClient);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data } = await apiClient.patch(`/orders/${orderId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    },
  }, queryClient);

  const handleMarkDelivered = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: "delivered" });
  };

  const filteredOrders = (orders || []).filter((o: any) =>
    activeTab === 'new'
      ? o.status !== 'delivered' && o.status !== 'cancelled'
      : o.status === 'delivered'
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };


  const renderHeader = useCallback(() => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>All Orders</Text>
        <Text style={styles.subtitle}>
          {filteredOrders.length} {activeTab === 'new' ? 'active' : 'delivered'} order{filteredOrders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>New Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'delivered' && styles.activeTab]}
          onPress={() => setActiveTab('delivered')}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.activeTabText]}>Delivered</Text>
        </TouchableOpacity>
      </View>
    </>
  ), [activeTab, filteredOrders.length, styles]);

  const renderItem = useCallback(({ item: order }: { item: any }) => {
    // Extract unique sellers from all items in this order
    const sellerMap: Record<string, { name: string; city: string }> = {};
    if (order.order_items) {
      order.order_items.forEach((item: any) => {
        const s = item.product?.seller;
        if (s && s.id && !sellerMap[s.id]) {
          sellerMap[s.id] = { name: s.business_name, city: s.city };
        }
      });
    }
    // Fallback to order-level seller if no item-level data
    if (Object.keys(sellerMap).length === 0 && order.seller) {
      sellerMap[order.seller_id] = {
        name: order.seller.business_name,
        city: order.seller.city
      };
    }
    const pickups = Object.values(sellerMap);

    // Delivery details come from the order's own snapshot, which is what the buyer confirmed at
    // checkout. `order.buyer` mirrors the `profiles` row: it can be blank, it can be stale, and it
    // never reflects a one-off address, so it is a fallback only - never the primary source.
    const deliveryAddress = order.delivery_address || {};
    const deliveryPhone = deliveryAddress.phone || order.buyer?.phone_number;
    // Built by filtering, so a missing line2 or state cannot leave a dangling ", " in the output.
    const deliveryLine = [
      deliveryAddress.street || deliveryAddress.line1,
      deliveryAddress.line2,
      deliveryAddress.city,
      deliveryAddress.state
    ].filter(Boolean).join(", ");
    const deliveryPincode = deliveryAddress.zip || deliveryAddress.pincode;

    const itemsSubtotal = orderSubtotalOf(order);
    const deliveryFee = resolveOrderDeliveryFee(itemsSubtotal, order.total);
    const orderTotal = itemsSubtotal + deliveryFee;

    return (
      <View style={styles.orderCard}>
        {/* Order header */}
        <View style={styles.orderHeaderRow}>
          <Text style={styles.orderId} selectable>#{order.id.substring(0, 8).toUpperCase()}</Text>
          <View style={[
            styles.statusBadge,
            order.status === 'delivered' && styles.statusDelivered,
            order.status === 'pending' && styles.statusPending,
          ]}>
            <Text style={[
              styles.badgeText,
              order.status === 'delivered' && styles.badgeTextDelivered,
            ]}>{order.status}</Text>
          </View>
        </View>

        {/* Date & Amount */}
        <View style={styles.orderMeta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{formatDate(order.created_at)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Item Total</Text>
            <Text style={styles.metaValue}>{formatCurrency(itemsSubtotal)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Delivery</Text>
            <Text style={styles.metaValue}>{deliveryFee > 0 ? formatCurrency(deliveryFee) : "FREE"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Total</Text>
            <Text style={[styles.metaValue, styles.metaAmount]}>{formatCurrency(orderTotal)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Platform Fee</Text>
            <Text style={styles.metaValue}>{formatCurrency(order.platform_fee)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment</Text>
            <Text style={[styles.metaValue, { textTransform: "uppercase" }]}>{order.payment_method}</Text>
          </View>
        </View>

        {/* Pickup & Delivery info */}
        <View style={styles.infoContainer}>
          {pickups.map((seller: any, idx: number) => (
            <View key={idx} style={styles.infoBlock}>
              <View style={styles.infoLabelRow}>
                <View style={[styles.infoDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.infoLabel}>
                  {pickups.length > 1 ? `PICKUP ${idx + 1} OF ${pickups.length}` : "PICKUP FROM"}
                </Text>
              </View>
              <Text style={styles.infoName}>{seller.name}</Text>
              <Text style={styles.infoDetail}>{seller.city || "City not set"}</Text>
            </View>
          ))}

          <View style={styles.infoDivider} />

          <View style={styles.infoBlock}>
            <View style={styles.infoLabelRow}>
              <View style={[styles.infoDot, { backgroundColor: "#34A853" }]} />
              <Text style={styles.infoLabel}>DELIVER TO</Text>
            </View>
            <Text style={styles.infoName}>{order.buyer?.full_name || "Unknown Buyer"}</Text>
            {deliveryPhone ? <Text style={styles.infoDetail}>{deliveryPhone}</Text> : null}
            {deliveryLine ? (
              <Text style={styles.infoDetail}>
                {deliveryLine}{deliveryPincode ? ` — ${deliveryPincode}` : ""}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Items */}
        {order.order_items && order.order_items.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.itemsTitle}>Items ({order.order_items.length})</Text>
            {order.order_items.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.quantity}× {item.product?.title || "Unknown Product"}
                </Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Mark Delivered button */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.deliverBtn}
            onPress={() => handleMarkDelivered(order.id)}
            disabled={updateStatusMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.deliverBtnText}>
              {updateStatusMutation.isPending ? "Updating..." : "Mark Delivered"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [colors.accent, styles, updateStatusMutation.isPending]);

  return (
    <Screen scroll={false}>
      {isLoading ? (
        <>
          {renderHeader()}
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        </>
      ) : (
        <FlashList
          data={filteredOrders}
          refreshControl={refreshControl}
          renderItem={renderItem}
          {...({ estimatedItemSize: 400 } as any)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ShieldIcon size={48} color={colors.border} />
              <Text style={styles.emptyText}>No {activeTab} orders found.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: {
    marginBottom: 24
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.5
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  tabContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  activeTab: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 13
  },
  activeTabText: {
    color: "#FFFFFF"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500"
  },
  list: {
    gap: 16
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  orderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14
  },
  orderId: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  statusDelivered: {
    backgroundColor: "rgba(52, 168, 83, 0.1)",
    borderColor: "rgba(52, 168, 83, 0.3)"
  },
  statusPending: {
    backgroundColor: "rgba(251, 188, 4, 0.1)",
    borderColor: "rgba(251, 188, 4, 0.3)"
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  badgeTextDelivered: {
    color: "#34A853"
  },
  orderMeta: {
    gap: 6,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  metaValue: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500"
  },
  metaAmount: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 15
  },
  infoContainer: {
    marginBottom: 14
  },
  infoBlock: {
    paddingVertical: 10
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  infoName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2
  },
  infoDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border
  },
  itemsSection: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  itemsTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: 13,
    flex: 1,
    marginRight: 12
  },
  itemPrice: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600"
  },
  deliverBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  deliverBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13
  }
});