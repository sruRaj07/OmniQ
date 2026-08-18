import { useState, useEffect } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, Alert, TouchableOpacity, ScrollView, Modal, TextInput } from "react-native";
import { Image } from "expo-image";
import { sizedImageUrl } from "@/utils/imageUrl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Svg, { Path, Circle, Rect, Polyline } from "react-native-svg";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { MenuIcon } from "@/components/ui/MenuIcon";
import { SearchIcon } from "@/components/ui/SearchIcon";
import { LocationGate } from "@/components/shared/LocationGate";
import { Screen } from "@/components/shared/Screen";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { useAppTheme } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/authStore";
import { sellerProfileOf, useSellerStatus } from "@/hooks/useSellerStatus";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";
const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().min(8, "Phone number is too short").optional().or(z.literal("")),
  address: z.string().min(5, "Address is too short").optional().or(z.literal("")),
  pincode: z.string().min(4, "Pincode is too short").optional().or(z.literal(""))
});
type ProfileFormData = z.infer<typeof profileSchema>;
function BellIcon({
  color = "#F0F0FF",
  size = 24
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>;
}
function SettingsIcon({
  color = "#F0F0FF",
  size = 24
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>;
}
function ChevronDownIcon({
  color = "#F0F0FF",
  size = 20
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="6 9 12 15 18 9" />
    </Svg>;
}
export default function ProfileScreen() {
  const {
    colors,
    mode,
    setMode
  } = useAppTheme();
  const styles = getStyles(colors);
  const {
    user
  } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const {
    isLoading: isSellerLoading,
    refetch: refetchSellerStatus
  } = useSellerStatus();
  const [isCheckingSellerPortal, setIsCheckingSellerPortal] = useState(false);
  const {
    buyerOrders,
    isLoading: isLoadingOrders
  } = useOrders();

  // Fetch the user's profile from the backend
  const {
    data: profileResponse,
    isLoading
  } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const res = await apiClient.get("/users/me");
      return res.data;
    },
    enabled: !!user
  });
  const profile = profileResponse?.data;

  // Fetch user's existing requests
  const { data: requestsResponse } = useQuery({
    queryKey: ["userRequests", user?.id],
    queryFn: async () => {
      const res = await apiClient.get("/users/requests");
      return res.data;
    },
    enabled: !!user
  });
  const userRequests = requestsResponse?.data || [];
  const pendingDeletion = userRequests.find((r: any) => r.type === "account_deletion" && r.status === "pending");

  // Mutation: create a user request
  const requestMutation = useMutation({
    mutationFn: async ({ type, reason }: { type: string; reason?: string }) => {
      const res = await apiClient.post("/users/requests", { type, reason });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["userRequests"] });
      const label = variables.type === "data_export" ? "Data Export" : "Account Deletion";
      Alert.alert("Request Submitted", `Your ${label} request has been submitted. Our team will review it shortly.`);
    },
    onError: (error: any) => {
      Alert.alert("Error", error?.response?.data?.message || error.message || "Failed to submit request.");
    }
  });

  // Account deletion is immediate and irreversible. It used to file a `pending` request that
  // nothing fulfilled, which is not a deletion path under Google Play's User Data policy - the
  // account has to actually go. DELETE /users/me always targets the caller's own verified identity.
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete("/users/me", { data: { confirm: "DELETE" } });
      return res.data;
    },
    onSuccess: async () => {
      setShowDeleteModal(false);
      setDeleteConfirmText("");
      setDeleteReason("");
      // The session's user no longer exists; clear it locally and drop every cached query so no
      // personal data survives in memory or in the persisted query cache on the device.
      await supabase.auth.signOut();
      queryClient.clear();
      Alert.alert(
        "Account deleted",
        "Your account and personal details have been permanently deleted. Past order records are kept for tax purposes with all identifying details removed."
      );
      // The sign-in screen is the (auth) group's index route; "/(auth)/login" does not exist.
      router.replace("/(auth)");
    },
    onError: (error: any) => {
      Alert.alert(
        "Deletion failed",
        error?.response?.data?.error?.message || error?.message || "Your account was not deleted. Please try again or contact support."
      );
    }
  });

  const handleDeleteAccountRequest = () => {
    setShowDeleteModal(true);
  };

  const submitDeleteRequest = () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert("Type DELETE to confirm", 'Please type DELETE in the confirmation box to permanently delete your account.');
      return;
    }
    deleteAccountMutation.mutate();
  };

  // Fallback to Supabase meta if backend profile isn't fully set up yet
  const displayFullName = profile?.full_name || user?.user_metadata?.full_name || "Buyer";
  const displayFirstName = displayFullName.split(' ')[0];
  const {
    control,
    handleSubmit,
    reset,
    formState: {
      errors
    }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      address: "",
      pincode: ""
    }
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name || user?.user_metadata?.full_name || "",
        phoneNumber: profile.phone_number || "",
        address: profile.address || "",
        pincode: profile.pincode || ""
      });
    }
  }, [profile, reset, user]);
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      await apiClient.patch("/users/me", {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber || undefined,
        address: data.address || undefined,
        pincode: data.pincode || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["userProfile"]
      });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    },
    onError: (error: any) => {
      Alert.alert("Error", error?.response?.data?.message || "Failed to update profile");
    }
  });
  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };
  
  const handlePasswordReset = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setIsResettingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsResettingPassword(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Your password has been successfully updated.");
      setShowPasswordResetModal(false);
      setNewPassword("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().setSession(null);
    router.replace("/");
  };
  // Confirm the seller account against the server on every tap instead of trusting whatever
  // useSellerStatus happens to hold. A cached or failed answer used to read as "not a seller",
  // which sent people who already have an approved store back to the application form.
  const handleOpenSellerPortal = async () => {
    if (isCheckingSellerPortal) return;
    setIsCheckingSellerPortal(true);
    try {
      const result = await refetchSellerStatus();
      if (result.isError || result.data === undefined) {
        Alert.alert(
          "Could not check your seller account",
          "We couldn't reach OmniQ just now. Check your connection and try again — your seller account is safe."
        );
        return;
      }
      const profile = sellerProfileOf(result.data);
      if (!profile) {
        router.push("/(seller)/apply" as any);
      } else if (profile.status === "pending") {
        router.push("/(seller)/pending" as any);
      } else if (profile.status === "approved" || profile.status === "active") {
        router.push("/(seller)/dashboard" as any);
      } else {
        Alert.alert("Account Status", `Your seller account is ${profile.status}.`);
      }
    } finally {
      setIsCheckingSellerPortal(false);
    }
  };
  return <Screen scroll={true} bottomNavItems={[{
    href: "/(buyer)",
    icon: HomeIcon,
    label: "Home"
  }, {
    href: "/(buyer)/cart",
    icon: ShoppingCartIcon,
    label: "Cart"
  }, {
    href: "/(buyer)/browse",
    icon: MenuIcon,
    label: "Browse"
  }, {
    href: "/(buyer)/orders",
    icon: BoxIcon,
    label: "Orders"
  }, {
    href: "/(buyer)/profile",
    icon: UserIcon,
    label: "Profile"
  }]}>
      {/* Top Header / Greeting */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hello, {displayFirstName}</Text>
          <ChevronDownIcon size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.headerIcons}>
          {/* Profile, orders and seller status all come from the server; this is where a user
              expects to confirm a change they just made elsewhere took effect. */}
          <RefreshButton size={36} />
          <TouchableOpacity style={styles.iconButton} onPress={() => setIsEditing(true)}>
            <SettingsIcon size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Action Pills */}
      <View style={styles.pillGrid}>
        <TouchableOpacity style={styles.pill} onPress={() => router.push("/(buyer)/orders")}>
          <Text style={styles.pillText}>Your Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => setIsEditing(true)}>
          <Text style={styles.pillText}>Your Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pill}
          onPress={handleOpenSellerPortal}
          disabled={isCheckingSellerPortal}
        >
          <Text style={styles.pillText}>
            {isCheckingSellerPortal || isSellerLoading ? 'Checking…' : 'Seller Portal'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Your Orders Horizontal Scroll */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Orders</Text>
          <TouchableOpacity onPress={() => router.push("/(buyer)/orders")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {isLoadingOrders ? <Text style={styles.meta}>Loading orders...</Text> : buyerOrders?.length > 0 ? buyerOrders.slice(0, 5).map((order: any) => {
          const product = order.order_items?.[0]?.product;
          const imageUrl = product?.images?.[0] || product?.imageUrl;
          return <TouchableOpacity key={order.id} style={styles.orderCard}>
                  {imageUrl ? <Image source={sizedImageUrl(imageUrl, { width: 160, quality: 60 })} style={styles.orderImage} contentFit="cover" transition={150} /> : <View style={styles.orderImagePlaceholder}>
                      <BoxIcon color={colors.textMuted} size={40} />
                    </View>}
                </TouchableOpacity>;
        }) : <Card style={styles.emptyCard}>
              <Text style={styles.meta}>No recent orders. Time to shop!</Text>
            </Card>}
        </ScrollView>
      </View>



      {/* Account Settings & Details */}
      <View style={[styles.section, {
      paddingBottom: 40
    }]}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        {isEditing ? <View style={styles.formContainer}>
            <Controller control={control} name="fullName" render={({
          field: {
            onChange,
            value
          }
        }) => <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <Input placeholder="Full Name" value={value} onChangeText={onChange} autoCapitalize="words" />
                  {errors.fullName && <Text style={styles.error}>{errors.fullName.message}</Text>}
                </View>} />

            <Controller control={control} name="phoneNumber" render={({
          field: {
            onChange,
            value
          }
        }) => <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <Input placeholder="Phone Number" value={value} onChangeText={onChange} keyboardType="phone-pad" />
                  {errors.phoneNumber && <Text style={styles.error}>{errors.phoneNumber.message}</Text>}
                </View>} />

            <Controller control={control} name="address" render={({
          field: {
            onChange,
            value
          }
        }) => <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address</Text>
                  <Input placeholder="Address" value={value} onChangeText={onChange} />
                  {errors.address && <Text style={styles.error}>{errors.address.message}</Text>}
                </View>} />

            <Controller control={control} name="pincode" render={({
          field: {
            onChange,
            value
          }
        }) => <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pincode</Text>
                  <Input placeholder="Pincode" value={value} onChangeText={onChange} keyboardType="number-pad" />
                  {errors.pincode && <Text style={styles.error}>{errors.pincode.message}</Text>}
                </View>} />

            <Button onPress={handleSubmit(onSubmit)} style={styles.actionButton}>
              {updateProfileMutation.isPending ? "Saving..." : "Save Details"}
            </Button>
            <Button variant="secondary" onPress={() => {
          reset();
          setIsEditing(false);
        }} style={styles.actionButton}>
              Cancel
            </Button>
          </View> : <View style={styles.detailsContainer}>
            {isLoading ? <Text style={styles.meta}>Loading details...</Text> : <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{user?.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{profile?.phone_number || "Not provided"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{profile?.address || "Not provided"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pincode:</Text>
                  <Text style={styles.detailValue}>{profile?.pincode || "Not provided"}</Text>
                </View>

                <Button variant="secondary" onPress={() => setIsEditing(true)} style={styles.actionButton}>
                  Edit Details
                </Button>
              </>}
          </View>}

        <View style={{ marginTop: 32 }}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <View style={styles.themeToggleContainer}>
            <Text style={styles.detailLabel}>Security:</Text>
            <Button variant="secondary" onPress={() => setShowPasswordResetModal(true)} style={{ minWidth: 140 }}>
              Change Password
            </Button>
          </View>
        </View>

        <View style={{
        marginTop: 24
      }}>
          <LocationGate pincode={profile?.pincode} city={profile?.address} />
        </View>

        {/* Data & Privacy Section */}
        <View style={{ marginTop: 32 }}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <Text style={[styles.meta, { textAlign: 'left', marginBottom: 16 }]}>
            You have the right to request a copy of your data or delete your account. Requests are reviewed within 30 days.
          </Text>

          <View style={styles.privacyCard}>
            <View style={[styles.privacyRow, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyLabel}>Delete Account</Text>
                <Text style={styles.privacyDesc}>Permanently remove your account and all associated data.</Text>
              </View>
              {pendingDeletion ? (
                <View style={[styles.pendingBadge, { backgroundColor: 'rgba(255,77,109,0.1)' }]}>
                  <Text style={[styles.pendingBadgeText, { color: colors.danger }]}>Pending</Text>
                </View>
              ) : (
                <Button variant="danger" onPress={handleDeleteAccountRequest} style={{ minWidth: 100 }}>
                  Delete
                </Button>
              )}
            </View>
          </View>
        </View>

        <Button variant="danger" onPress={handleSignOut} style={{
        marginTop: 24
      }}>
          Sign Out
        </Button>
      </View>

      {/* Password Reset Modal */}
      <Modal
        visible={showPasswordResetModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPasswordResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.meta}>Enter your new password below.</Text>
            
            <View style={{ marginTop: 24, marginBottom: 24 }}>
              <Text style={styles.label}>New Password</Text>
              <Input 
                placeholder="At least 6 characters" 
                value={newPassword} 
                onChangeText={setNewPassword} 
                secureTextEntry 
              />
            </View>
            
            <Button onPress={handlePasswordReset} style={{ marginBottom: 12 }}>
              {isResettingPassword ? "Updating..." : "Update Password"}
            </Button>
            <Button variant="secondary" onPress={() => {
              setShowPasswordResetModal(false);
              setNewPassword("");
            }}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: colors.danger }]}>⚠️ Delete Account</Text>
            <Text style={[styles.meta, { textAlign: 'left', marginBottom: 8 }]}>
              Please review the following before proceeding:
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.deleteTermItem}>• If approved, your account will be removed within 30 days</Text>
              <Text style={styles.deleteTermItem}>• The request may be rejected for some reason (e.g., active orders)</Text>
              <Text style={styles.deleteTermItem}>• If rejected, this request will be dismissed and you will be notified</Text>
              <Text style={styles.deleteTermItem}>• Upon deletion, all personal data will be permanently removed</Text>
              <Text style={styles.deleteTermItem}>• You will not be able to recover your account once deleted</Text>
            </View>

            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.deleteReasonInput}
              placeholder="Tell us why you're leaving..."
              placeholderTextColor={colors.textMuted}
              value={deleteReason}
              onChangeText={setDeleteReason}
              multiline
              numberOfLines={3}
            />

            <Button variant="danger" onPress={submitDeleteRequest} style={{ marginTop: 16, marginBottom: 12 }}>
              {requestMutation.isPending ? "Submitting..." : "Confirm Delete Request"}
            </Button>
            <Button variant="secondary" onPress={() => {
              setShowDeleteModal(false);
              setDeleteReason("");
            }}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  greetingText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32
  },
  pill: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pillText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 15
  },
  section: {
    marginBottom: 32
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  seeAll: {
    color: colors.accentLight,
    fontWeight: '700',
    fontSize: 13
  },
  horizontalScroll: {
    paddingRight: 24,
    gap: 16
  },
  orderCard: {
    width: 140,
    height: 140,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  orderImage: {
    width: '100%',
    height: '100%'
  },
  orderImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card2
  },
  emptyCard: {
    padding: 24,
    width: '100%',
    alignItems: 'center'
  },
  detailsContainer: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 20,
    marginTop: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12
  },
  detailLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15
  },
  detailValue: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 15
  },
  formContainer: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: "700",
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  error: {
    color: colors.danger,
    fontSize: 11,
    marginTop: 4
  },
  actionButton: {
    marginTop: 16
  },
  emptyCardText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center"
  },
  meta: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center"
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8
  },
  themeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  themeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  themeButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  themeButtonTextActive: {
    color: '#FFFFFF'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  privacyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  privacyLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  privacyDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 170, 0, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pendingBadgeText: {
    color: colors.warning || '#FFAA00',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteTermItem: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 22,
  },
  deleteReasonInput: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
});