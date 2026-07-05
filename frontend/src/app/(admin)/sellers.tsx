/**
 * OmniQ mobile app - admin sellers screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function AdminSellersScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const { data: sellers, isLoading } = useQuery({
    queryKey: ["adminSellers"],
    queryFn: async () => {
      const res = await apiClient.get("/sellers");
      return res.data.data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(`/sellers/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSellers"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.badgeRow}>
            <UsersIcon size={14} color="#6C63FF" />
            <Text style={styles.superAdminText}>MERCHANTS</Text>
          </View>
          <Text style={styles.title}>Seller Management</Text>
          <Text style={styles.subtitle}>Approve or suspend sellers</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 40 }} />
      ) : sellers?.length === 0 ? (
        <View style={styles.emptyState}>
          <ShieldIcon size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>No sellers found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sellers?.map((seller: any) => (
            <LinearGradient
              key={seller.id}
              colors={["rgba(30, 30, 45, 0.7)", "rgba(15, 15, 26, 0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
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
                <View style={[
                  styles.statusBadge, 
                  seller.status === "approved" ? styles.badgeSuccess : 
                  seller.status === "suspended" ? styles.badgeDanger : 
                  styles.badgeWarning
                ]}>
                  <Text style={[
                    styles.badgeText,
                    seller.status === "approved" ? { color: "#4CAF50" } : 
                    seller.status === "suspended" ? { color: "#F93C65" } : 
                    { color: "#FFC107" }
                  ]}>
                    {seller.status}
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
                      style={[styles.button, styles.btnSuccess]} 
                      onPress={() => updateStatus.mutate({ id: seller.id, status: "approved" })}
                    >
                      <Text style={[styles.btnText, { color: "#4CAF50" }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.button, styles.btnDanger]} 
                      onPress={() => updateStatus.mutate({ id: seller.id, status: "rejected" })}
                    >
                      <Text style={[styles.btnText, { color: "#F93C65" }]}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {seller.status === "approved" && (
                  <TouchableOpacity 
                    style={[styles.button, styles.btnDanger]} 
                    onPress={() => updateStatus.mutate({ id: seller.id, status: "suspended" })}
                  >
                    <Text style={[styles.btnText, { color: "#F93C65" }]}>Suspend</Text>
                  </TouchableOpacity>
                )}
                
                {seller.status === "suspended" && (
                  <TouchableOpacity 
                    style={[styles.button, styles.btnWarning]} 
                    onPress={() => updateStatus.mutate({ id: seller.id, status: "approved" })}
                  >
                    <Text style={[styles.btnText, { color: "#FFC107" }]}>Restore</Text>
                  </TouchableOpacity>
                )}
                
                {seller.status === "approved" && (
                  <TouchableOpacity 
                    style={[styles.button, styles.btnPrimary]} 
                    onPress={() => router.push(`/(admin)/seller-products?sellerId=${seller.id}&storeName=${encodeURIComponent(seller.business_name || '')}`)}
                  >
                    <Text style={[styles.btnText, { color: "#6C63FF" }]}>Review Products</Text>
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          ))}
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
  headerContent: {
    flex: 1,
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
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  storeName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  category: {
    color: "#6C63FF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  city: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  description: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSuccess: { 
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "rgba(76, 175, 80, 0.3)"
  },
  badgeWarning: { 
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderColor: "rgba(255, 193, 7, 0.3)"
  },
  badgeDanger: { 
    backgroundColor: "rgba(249, 60, 101, 0.1)",
    borderColor: "rgba(249, 60, 101, 0.3)"
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSuccess: { 
    backgroundColor: "rgba(76, 175, 80, 0.05)", 
    borderWidth: 1, 
    borderColor: "rgba(76, 175, 80, 0.2)" 
  },
  btnDanger: { 
    backgroundColor: "rgba(249, 60, 101, 0.05)", 
    borderWidth: 1, 
    borderColor: "rgba(249, 60, 101, 0.2)" 
  },
  btnWarning: { 
    backgroundColor: "rgba(255, 193, 7, 0.05)", 
    borderWidth: 1, 
    borderColor: "rgba(255, 193, 7, 0.2)" 
  },
  btnPrimary: {
    backgroundColor: "rgba(108, 99, 255, 0.05)", 
    borderWidth: 1, 
    borderColor: "rgba(108, 99, 255, 0.3)" 
  },
  btnText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  }
});
