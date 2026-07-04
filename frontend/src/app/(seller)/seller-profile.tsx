import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export default function SellerProfileScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState("");
  
  const router = useRouter();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().setSession(null);
    router.replace("/");
  };

  const { data: sellerData, isLoading } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sellers/me");
      return data.data;
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      await apiClient.patch("/sellers/me", { description: newDescription });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      setIsEditingDescription(false);
    }
  });

  const handleEditDescription = () => {
    setEditDescriptionValue(sellerData?.description || "");
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    updateProfileMutation.mutate(editDescriptionValue);
  };

  const displayFullName = sellerData?.business_name || user?.user_metadata?.full_name || "OmniQ Seller";
  const initial = displayFullName.charAt(0).toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'suspended': return colors.danger;
      case 'rejected': return colors.danger;
      default: return colors.accent;
    }
  };

  return (
    <>
      <Screen bottomNavItems={[
          { href: "/(seller)/dashboard" as any, icon: HomeIcon, label: "Home" },
          { href: "/(seller)/products" as any, icon: ListIcon, label: "Products" },
          { href: "/(seller)/seller-orders" as any, icon: BoxIcon, label: "Orders" },
          { href: "/(seller)/seller-profile" as any, icon: UserIcon, label: "Profile" }
        ]}>
        <Text style={styles.title}>Seller Profile</Text>
        
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            <Card style={styles.card}>
              <Text style={styles.avatar}>{initial}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{displayFullName}</Text>
                <Text style={styles.meta}>{user?.email || "Seller account"}</Text>
                <View style={[styles.roleBadge, { backgroundColor: getStatusColor(sellerData?.status) }]}>
                  <Text style={styles.roleBadgeText}>{(sellerData?.status || "UNKNOWN").toUpperCase()}</Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Business Details</Text>
            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.rowHeader}>
                  <Text style={styles.infoLabel}>Description</Text>
                  {!isEditingDescription ? (
                    <TouchableOpacity onPress={handleEditDescription}>
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {isEditingDescription ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={editDescriptionValue}
                      onChangeText={setEditDescriptionValue}
                      multiline
                      autoFocus
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={() => setIsEditingDescription(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={handleSaveDescription} 
                        style={styles.saveBtn}
                        disabled={updateProfileMutation.isPending}
                      >
                        <Text style={styles.saveText}>
                          {updateProfileMutation.isPending ? "Saving..." : "Save"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.infoValue}>{sellerData?.description || "Not provided"}</Text>
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{sellerData?.category || "Not provided"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{sellerData?.city || "Not provided"}</Text>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Financials & Tax</Text>
            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GST Number</Text>
                <Text style={styles.infoValue}>{sellerData?.gst_number || "Not provided"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bank Account</Text>
                <Text style={styles.infoValue}>{sellerData?.bank_account || "Not provided"}</Text>
              </View>
            </Card>
            
            <Link href="/(buyer)" asChild>
              <Button variant="secondary" style={styles.actionButton}>Switch to Buyer App</Button>
            </Link>
            <Button variant="danger" onPress={handleSignOut} style={[styles.actionButton, { marginBottom: 20 }]}>
              Sign Out
            </Button>
          </ScrollView>
        )}
      </Screen>
      
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 18
  },
  card: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 18
  },
  cardInfo: {
    flex: 1,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 58,
    fontSize: 26,
    fontWeight: "900",
    overflow: "hidden"
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900"
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 3
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    marginLeft: 4
  },
  infoCard: {
    padding: 16,
    marginBottom: 24
  },
  infoRow: {
    flexDirection: "column",
    gap: 4,
    paddingVertical: 8
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500"
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  editText: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: "bold"
  },
  editContainer: {
    marginTop: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    borderColor: colors.border,
    borderWidth: 1
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: "bold"
  },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold"
  },
  actionButton: {
    marginTop: 14
  }
});
