/**
 * OmniQ mobile app - buyer profile screen.
 * Author: OmniQ Team
 */
import { useState, useEffect } from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { LocationGate } from "@/components/shared/LocationGate";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().min(8, "Phone number is too short").optional().or(z.literal("")),
  address: z.string().min(5, "Address is too short").optional().or(z.literal("")),
  pincode: z.string().min(4, "Pincode is too short").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch the user's profile from the backend
  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const res = await apiClient.get("/users/me");
      return res.data;
    },
    enabled: !!user,
  });

  const profile = profileResponse?.data;
  
  // Fallback to Supabase meta if backend profile isn't fully set up yet
  const displayFullName = profile?.full_name || user?.user_metadata?.full_name || "Buyer";
  const displayRole = profile?.role || user?.user_metadata?.role || "buyer";
  const initial = displayFullName.charAt(0).toUpperCase();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      address: "",
      pincode: "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name || user?.user_metadata?.full_name || "",
        phoneNumber: profile.phone_number || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
      });
    }
  }, [profile, reset, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // 1. Update Profile fields
      await apiClient.patch("/users/me", {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber || undefined,
        address: data.address || undefined,
        pincode: data.pincode || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    },
    onError: (error: any) => {
      Alert.alert("Error", error?.response?.data?.message || "Failed to update profile");
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <Screen scroll={true}>
        <Text style={styles.title}>Profile</Text>
        
        <Card style={styles.card}>
          <Text style={styles.avatar}>{initial}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{displayFullName}</Text>
            <Text style={styles.meta}>{user?.email || "Buyer account"}</Text>
            {displayRole && <Text style={styles.roleBadge}>{displayRole.toUpperCase()}</Text>}
          </View>
        </Card>

        {isEditing ? (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Edit Details</Text>
            
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <Input placeholder="Full Name" value={value} onChangeText={onChange} autoCapitalize="words" />
                  {errors.fullName && <Text style={styles.error}>{errors.fullName.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="phoneNumber"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <Input placeholder="Phone Number" value={value} onChangeText={onChange} keyboardType="phone-pad" />
                  {errors.phoneNumber && <Text style={styles.error}>{errors.phoneNumber.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address</Text>
                  <Input placeholder="Address" value={value} onChangeText={onChange} />
                  {errors.address && <Text style={styles.error}>{errors.address.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="pincode"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pincode</Text>
                  <Input placeholder="Pincode" value={value} onChangeText={onChange} keyboardType="number-pad" />
                  {errors.pincode && <Text style={styles.error}>{errors.pincode.message}</Text>}
                </View>
              )}
            />

            <Button 
              onPress={handleSubmit(onSubmit)} 
              style={styles.actionButton}
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Details"}
            </Button>
            <Button 
              variant="secondary" 
              onPress={() => {
                reset();
                setIsEditing(false);
              }} 
              style={styles.actionButton}
            >
              Cancel
            </Button>
          </View>
        ) : (
          <View style={styles.detailsContainer}>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading details...</Text>
            ) : (
              <>
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
              </>
            )}
          </View>
        )}

        <LocationGate />
        
        <Link href={"/(seller)/dashboard" as any} asChild>
          <Button style={styles.actionButton}>Open Seller Portal</Button>
        </Link>
        <Button variant="danger" onPress={handleSignOut} style={styles.actionButton}>
          Sign Out
        </Button>
      </Screen>

      <BottomNavBar
        items={[
          { href: "/(buyer)" as any, icon: "🏠", label: "Home" },
          { href: "/(buyer)/explore" as any, icon: "🔎", label: "Explore" },
          { href: "/(buyer)/cart" as any, icon: "🛒", label: "Cart" },
          { href: "/(buyer)/orders" as any, icon: "📦", label: "Orders" },
          { href: "/(buyer)/profile" as any, icon: "👤", label: "Profile" }
        ]}
      />
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
    gap: 16
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
    color: colors.textMuted,
    marginTop: 3
  },
  roleBadge: {
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 8,
  },
  detailsContainer: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginTop: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  detailValue: {
    color: colors.textPrimary,
    fontWeight: "500",
  },
  loadingText: {
    color: colors.textMuted,
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginTop: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  actionButton: {
    marginTop: 14
  }
});
