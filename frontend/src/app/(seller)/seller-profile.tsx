import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
export default function SellerProfileScreen() {
  const {
    colors,
    mode,
    setMode
  } = useAppTheme();
  const styles = getStyles(colors, mode);
  const {
    user
  } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState("");
  const router = useRouter();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().setSession(null);
    router.replace("/");
  };
  const {
    data: sellerData,
    isLoading
  } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const {
        data
      } = await apiClient.get("/sellers/me");
      return data.data;
    }
  });

  const { data: userProfileData } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const res = await apiClient.get("/users/me");
      return res.data;
    },
    enabled: !!user
  });
  const userProfile = userProfileData?.data;

  const updateProfileMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      await apiClient.patch("/sellers/me", {
        description: newDescription
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["seller-profile"]
      });
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
      case 'approved':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'suspended':
        return colors.danger;
      case 'rejected':
        return colors.danger;
      default:
        return colors.accent;
    }
  };
  return <>
      <Screen bottomNavItems={[{
      href: "/(seller)/dashboard" as any,
      icon: HomeIcon,
      label: "Home"
    }, {
      href: "/(seller)/products" as any,
      icon: ListIcon,
      label: "Products"
    }, {
      href: "/(seller)/seller-orders" as any,
      icon: BoxIcon,
      label: "Orders"
    }, {
      href: "/(seller)/seller-profile" as any,
      icon: UserIcon,
      label: "Profile"
    }]}>
        {isLoading ? <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
        paddingBottom: 100
      }}>
            <View style={styles.header}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.name}>{displayFullName}</Text>
                  <Text style={styles.email}>{user?.email || "Seller account"}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getStatusColor(sellerData?.status) }]}>
                    <Text style={styles.roleBadgeText}>{(sellerData?.status || "UNKNOWN").toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              <Card style={styles.infoCard}>
                
                {/* Description */}
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
                    <Text style={styles.infoValue}>{sellerData?.description || "No description provided."}</Text>
                  )}
                </View>

                <View style={styles.divider} />
                
                {/* Category */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{sellerData?.category || "N/A"}</Text>
                </View>
                
                <View style={styles.divider} />

                {/* City */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City</Text>
                  <Text style={styles.infoValue}>{sellerData?.city || "N/A"}</Text>
                </View>

                <View style={styles.divider} />

                {/* GST */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>GST Number</Text>
                  <Text style={styles.infoValue}>{sellerData?.gst_number || "N/A"}</Text>
                </View>

              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <Card style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || "N/A"}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{userProfile?.phone_number || "Not provided"}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{userProfile?.address || "Not provided"}</Text>
                </View>
                {userProfile?.pincode && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Pincode</Text>
                      <Text style={styles.infoValue}>{userProfile.pincode}</Text>
                    </View>
                  </>
                )}
              </Card>
            </View>


            <View style={styles.actionsContainer}>
              <Link href="/(buyer)" asChild>
                <Button variant="secondary" style={styles.actionButton}>Switch to Buyer App</Button>
              </Link>
              <Button variant="secondary" onPress={handleSignOut} style={styles.actionButton}>
                Sign Out
              </Button>
            </View>
          </ScrollView>
        }
      </Screen>
    </>;
}

const getStyles = (colors: any, mode?: string) => StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  email: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  infoCard: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    paddingVertical: 12,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  editText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  editContainer: {
    marginTop: 8,
  },
  textInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: 6,
    padding: 12,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
    borderColor: colors.border,
    borderWidth: 1,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionsContainer: {
    marginTop: 10,
    gap: 12,
  },
  actionButton: {
    width: "100%",
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  themeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  themeButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  themeButtonTextActive: {
    color: "#FFFFFF",
  },
});