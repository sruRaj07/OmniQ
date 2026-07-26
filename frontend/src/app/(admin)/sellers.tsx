/**
 * OmniQ mobile app - admin sellers screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { useRouter } from "expo-router";

export default function AdminSellersScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'requests' | 'approved'>('requests');

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["adminSellers"],
    queryFn: async () => {
      const res = await apiClient.get("/sellers");
      return res.data.data;
    }
  }, queryClient);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string; }) => {
      await apiClient.patch(`/sellers/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSellers"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  }, queryClient);

  const filteredSellers = (sellers || []).filter((seller: any) => 
    activeTab === 'requests' ? seller.status === 'pending' : seller.status !== 'pending'
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Seller Management</Text>
          <Text style={styles.subtitle}>Approve or suspend sellers</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>Approved</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : filteredSellers.length === 0 ? (
        <View style={styles.emptyState}>
          <ShieldIcon size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>No {activeTab} sellers found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredSellers.map((seller: any) => (
            <View key={seller.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.storeName}>{seller.business_name || "Unknown Store"}</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.category}>{seller.category || "Uncategorized"}</Text>
                    <View style={styles.dotSeparator} />
                    <LocationIcon size={12} color={colors.textMuted} />
                    <Text style={styles.city}>{seller.city || "Unknown"}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { borderColor: seller.status === 'approved' ? colors.success : seller.status === 'pending' ? colors.warning : colors.danger }]}>
                  <Text style={[styles.badgeText, { color: seller.status === 'approved' ? colors.success : seller.status === 'pending' ? colors.warning : colors.danger }]}>
                    {seller.status === 'approved' ? "✓ APPROVED" : seller.status === 'pending' ? "⏳ PENDING" : seller.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {seller.description || "No description provided."}
              </Text>
              
              <View style={styles.actions}>
                {seller.status === "pending" && (
                  <>
                    <TouchableOpacity 
                      style={[styles.button, { backgroundColor: colors.accent, borderColor: colors.accent }]} 
                      onPress={() => updateStatus.mutate({ id: seller.id, status: "approved" })}
                    >
                      <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.button} 
                      onPress={() => updateStatus.mutate({ id: seller.id, status: "rejected" })}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {seller.status === "approved" && (
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={() => updateStatus.mutate({ id: seller.id, status: "suspended" })}
                  >
                    <Text style={styles.btnText}>Suspend</Text>
                  </TouchableOpacity>
                )}
                
                {seller.status === "suspended" && (
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={() => updateStatus.mutate({ id: seller.id, status: "approved" })}
                  >
                    <Text style={styles.btnText}>Restore</Text>
                  </TouchableOpacity>
                )}
                
                {seller.status === "approved" && (
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={() => router.push(`/(admin)/seller-products?sellerId=${seller.id}&storeName=${encodeURIComponent(seller.business_name || '')}`)}
                  >
                    <Text style={styles.btnText}>Review Products</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 60 }} />
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: {
    marginBottom: 24
  },
  headerContent: {
    flex: 1
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
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600"
  },
  list: {
    gap: 16
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  storeName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border
  },
  category: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5
  },
  city: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: "500"
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "transparent"
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  btnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5
  }
});