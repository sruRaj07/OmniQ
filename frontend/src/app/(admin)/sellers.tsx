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
import { BarIcon } from "@/components/ui/BarIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { useRouter } from "expo-router";

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
    <>
      <Screen scroll>
        <Text style={styles.title}>Seller Management</Text>
        <Text style={styles.subtitle}>Approve or suspend sellers</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : sellers?.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No sellers found.</Text>
        ) : (
          <View style={styles.list}>
            {sellers?.map((seller: any) => (
              <View key={seller.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.storeName}>{seller.business_name || "Unknown Store"}</Text>
                  <View style={[styles.badge, seller.status === "approved" ? styles.badgeSuccess : seller.status === "suspended" ? styles.badgeDanger : styles.badgeWarning]}>
                    <Text style={styles.badgeText}>{seller.status}</Text>
                  </View>
                </View>
                <Text style={styles.description} numberOfLines={2}>{seller.description || "No description provided."}</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.category}>{seller.category || "Uncategorized"}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <LocationIcon size={12} color={colors.textMuted} />
                    <Text style={styles.city}>{seller.city || "Unknown City"}</Text>
                  </View>
                </View>
                
                <View style={styles.actions}>
                  {seller.status === "pending" && (
                    <>
                      <TouchableOpacity style={[styles.button, styles.btnSuccess]} onPress={() => updateStatus.mutate({ id: seller.id, status: "approved" })}>
                        <Text style={styles.btnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.button, styles.btnDanger]} onPress={() => updateStatus.mutate({ id: seller.id, status: "rejected" })}>
                        <Text style={styles.btnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {seller.status === "approved" && (
                    <TouchableOpacity style={[styles.button, styles.btnDanger]} onPress={() => updateStatus.mutate({ id: seller.id, status: "suspended" })}>
                      <Text style={styles.btnText}>Suspend</Text>
                    </TouchableOpacity>
                  )}
                  {seller.status === "suspended" && (
                    <TouchableOpacity style={[styles.button, styles.btnWarning]} onPress={() => updateStatus.mutate({ id: seller.id, status: "approved" })}>
                      <Text style={styles.btnText}>Restore</Text>
                    </TouchableOpacity>
                  )}
                  
                  {seller.status === "approved" && (
                    <TouchableOpacity 
                      style={[styles.button, { backgroundColor: "rgba(155, 89, 182, 0.15)", borderWidth: 1, borderColor: "rgba(155,89,182,0.5)" }]} 
                      onPress={() => router.push(`/(admin)/seller-products?sellerId=${seller.id}&storeName=${encodeURIComponent(seller.business_name || '')}`)}
                    >
                      <Text style={[styles.btnText, { color: "rgba(255,255,255,0.9)" }]}>Review Products</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </Screen>
      
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 20
  },
  list: {
    gap: 16
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  storeName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20
  },
  detailsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  category: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: "700"
  },
  city: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeSuccess: { backgroundColor: "rgba(46, 204, 113, 0.2)" },
  badgeWarning: { backgroundColor: "rgba(241, 196, 15, 0.2)" },
  badgeDanger: { backgroundColor: "rgba(231, 76, 60, 0.2)" },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  btnSuccess: { backgroundColor: "rgba(46, 204, 113, 0.15)", borderWidth: 1, borderColor: "rgba(46,204,113,0.5)" },
  btnDanger: { backgroundColor: "rgba(231, 76, 60, 0.15)", borderWidth: 1, borderColor: "rgba(231,76,60,0.5)" },
  btnWarning: { backgroundColor: "rgba(241, 196, 15, 0.15)", borderWidth: 1, borderColor: "rgba(241,196,15,0.5)" },
  btnText: {
    color: colors.textPrimary,
    fontWeight: "800"
  }
});
