/**
 * OmniQ mobile app - seller incoming orders.
 * Author: OmniQ Team
 */
import React, { useState } from "react";
import { StyleSheet, Text, ActivityIndicator, View, TouchableOpacity, Modal, ScrollView } from "react-native";
import { OrderCard } from "@/components/seller/OrderCard";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { useOrders } from "@/hooks/useOrders";
import { router } from "expo-router";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { formatCurrency } from "@/utils/formatCurrency";

export default function SellerOrdersScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const { sellerOrders, isLoading } = useOrders();
  const [activeTab, setActiveTab] = useState<'new' | 'old'>('new');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const pendingOrders = sellerOrders.filter((order: any) => order.status === 'pending');
  const readyOrders = sellerOrders.filter((order: any) => order.status === 'packed' || order.status === 'dispatched');
  const activeOrders = [...pendingOrders, ...readyOrders];
  const completedOrders = sellerOrders.filter((order: any) => order.status === 'delivered' || order.status === 'cancelled');

  const displayedOrders = activeTab === 'new' ? activeOrders : completedOrders;

  return (
    <Screen
      bottomNavItems={[
        { href: "/(seller)/dashboard" as any, icon: HomeIcon, label: "Home" },
        { href: "/(seller)/products" as any, icon: ListIcon, label: "Products" },
        { href: "/(seller)/seller-orders" as any, icon: BoxIcon, label: "Orders" },
        { href: "/(seller)/seller-profile" as any, icon: UserIcon, label: "Profile" },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Manage Orders</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'new' && styles.activeTab]} 
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            New Orders {activeOrders.length > 0 && `(${activeOrders.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'old' && styles.activeTab]} 
          onPress={() => setActiveTab('old')}
        >
          <Text style={[styles.tabText, activeTab === 'old' && styles.activeTabText]}>
            Old Orders
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {displayedOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'new' ? "No new orders to prepare right now." : "No previous orders found."}
              </Text>
            </View>
          ) : (
            displayedOrders.map((order: any) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                isSeller={true} 
                onPress={() => setSelectedOrder(order)} 
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>
            
            {selectedOrder && (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.detailValue}>{selectedOrder.id.toUpperCase()}</Text>
                
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{selectedOrder.status || 'Pending'}</Text>
                
                <View style={styles.divider} />
                
                <Text style={styles.sectionTitle}>Items to Pack</Text>
                {selectedOrder.order_items?.map((item: any) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.product?.title || 'Unknown Item'}</Text>
                    <Text style={styles.itemQty}>x{item.quantity || 1}</Text>
                  </View>
                ))}
                
                <View style={styles.divider} />
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(Number(selectedOrder.total || selectedOrder.total_amount || 0))}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: {
    paddingBottom: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  content: {
    paddingBottom: 20,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    maxHeight: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeButton: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: 16,
  },
  itemQty: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.goldLight,
  },
});