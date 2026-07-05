/**
 * OmniQ mobile app - admin orders screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/shared/Screen";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";
import { LinearGradient } from "expo-linear-gradient";
import { formatCurrency } from "@/utils/formatCurrency";

export default function AdminOrdersScreen() {
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/orders");
      return res.data.data;
    },
  });

  // Group orders by seller
  const groupedOrders = (orders || []).reduce((acc: any, order: any) => {
    const sellerId = order.seller_id || "unknown";
    if (!acc[sellerId]) {
      acc[sellerId] = {
        id: sellerId,
        businessName: order.seller?.business_name || "Unknown Seller",
        orders: [],
        totalRevenue: 0,
      };
    }
    acc[sellerId].orders.push(order);
    acc[sellerId].totalRevenue += Number(order.total || 0);
    return acc;
  }, {});

  const sellerGroups = Object.values(groupedOrders);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('en-GB', { 
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <BoxIcon size={14} color="#6C63FF" />
          <Text style={styles.superAdminText}>TRANSACTIONS</Text>
        </View>
        <Text style={styles.title}>All Orders</Text>
        <Text style={styles.subtitle}>Platform-wide transaction feed</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 40 }} />
      ) : sellerGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <ShieldIcon size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>No orders found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sellerGroups.map((group: any) => {
            const isExpanded = expandedSeller === group.id;
            return (
              <View key={group.id} style={styles.groupContainer}>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  onPress={() => setExpandedSeller(isExpanded ? null : group.id)}
                >
                  <LinearGradient
                    colors={["rgba(30, 30, 45, 0.7)", "rgba(15, 15, 26, 0.9)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sellerHeaderCard}
                  >
                    <View style={styles.sellerHeaderLeft}>
                      <Text style={styles.sellerName}>{group.businessName}</Text>
                      <Text style={styles.orderCountBadge}>{group.orders.length} {group.orders.length === 1 ? 'Order' : 'Orders'}</Text>
                    </View>
                    <View style={styles.sellerHeaderRight}>
                      <Text style={styles.sellerRevenue}>{formatCurrency(group.totalRevenue)}</Text>
                      <Text style={styles.expandIcon}>{isExpanded ? "▲" : "▼"}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.ordersList}>
                    {group.orders.map((order: any) => (
                      <View key={order.id} style={styles.orderCard}>
                        <View style={styles.orderHeaderRow}>
                          <Text style={styles.orderId} selectable>#{order.id.substring(0, 8).toUpperCase()}</Text>
                          <View style={[styles.statusBadge, order.status === 'delivered' ? styles.badgeSuccess : styles.badgeWarning]}>
                            <Text style={styles.badgeText}>{order.status}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.orderMetadata}>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Date:</Text>
                            <Text style={styles.metaValue}>{formatDate(order.created_at)}</Text>
                          </View>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Buyer ID:</Text>
                            <Text style={styles.metaValue} selectable>{order.buyer_id}</Text>
                          </View>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Amount:</Text>
                            <Text style={[styles.metaValue, { color: "#FFF", fontWeight: "800" }]}>{formatCurrency(order.total)}</Text>
                          </View>
                          {order.platform_fee && (
                            <View style={styles.metaRow}>
                              <Text style={styles.metaLabel}>Platform Fee:</Text>
                              <Text style={styles.metaValue}>{formatCurrency(order.platform_fee)}</Text>
                            </View>
                          )}
                        </View>

                        {order.order_items && order.order_items.length > 0 && (
                          <View style={styles.itemsSection}>
                            <Text style={styles.itemsTitle}>Items ({order.order_items.length})</Text>
                            {order.order_items.map((item: any, idx: number) => (
                              <View key={idx} style={styles.itemRow}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                  {item.quantity}x {item.product?.title || "Unknown Product"}
                                </Text>
                                <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        
                        {order.delivery_address && (
                          <View style={styles.addressSection}>
                            <Text style={styles.addressTitle}>Delivery Address</Text>
                            <Text style={styles.addressText}>
                              {order.delivery_address.street || order.delivery_address.line1}, {order.delivery_address.city} - {order.delivery_address.zip || order.delivery_address.pincode}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 60 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  superAdminText: {
    color: "#6C63FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    gap: 16
  },
  groupContainer: {
    marginBottom: 8,
  },
  sellerHeaderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  sellerHeaderLeft: {
    flex: 1,
  },
  sellerHeaderRight: {
    alignItems: "flex-end",
  },
  sellerName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  orderCountBadge: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "700",
  },
  sellerRevenue: {
    color: "#4CAF50",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  expandIcon: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
  ordersList: {
    marginTop: 12,
    gap: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(255,255,255,0.05)",
    marginLeft: 20,
  },
  orderCard: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  orderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderId: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeSuccess: { 
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "rgba(76, 175, 80, 0.3)"
  },
  badgeWarning: { 
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderColor: "rgba(108, 99, 255, 0.3)"
  },
  badgeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  orderMetadata: {
    gap: 6,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "600",
  },
  metaValue: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  itemsSection: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemsTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  itemPrice: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  addressSection: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
  },
  addressTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  addressText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 18,
  }
});
