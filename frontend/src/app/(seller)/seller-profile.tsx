/**
 * OmniQ mobile app - seller profile and store settings.
 *
 * The old screen nested its own ScrollView inside Screen's, which double-handles every
 * scroll gesture on Android. It scrolls once now, and the store details read as a store
 * card rather than a wall of uppercase labels.
 *
 * Author: OmniQ Team
 */
import React, { useCallback, useMemo, useState } from "react";
import { Link, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/shared/Screen";
import { SELLER_NAV_ITEMS } from "@/components/seller/sellerNav";
import { Avatar, InfoRow, SectionHeader, SkeletonRows, StatusPill, Surface } from "@/components/seller/SellerUI";
import { useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { RADIUS, SPACE, withAlpha } from "@/constants/sellerTheme";
import {
  InfoIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  StoreIcon,
  SwapIcon,
  TagIcon,
} from "@/components/ui/SellerIcons";

/** Approval state drives the badge colour on the hero card. */
function statusTone(status: string | undefined, colors: any) {
  switch (String(status ?? "").toLowerCase()) {
    case "approved":
      return { label: "Approved seller", color: colors.success };
    case "pending":
      return { label: "Awaiting approval", color: colors.warning };
    case "suspended":
      return { label: "Suspended", color: colors.danger };
    case "rejected":
      return { label: "Rejected", color: colors.danger };
    default:
      return { label: "Status unknown", color: colors.textMuted };
  }
}

export default function SellerProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState("");

  const { data: sellerData, isLoading } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sellers/me");
      return data.data;
    },
  });

  const { data: userProfileData } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const res = await apiClient.get("/users/me");
      return res.data;
    },
    enabled: !!user,
  });
  const userProfile = userProfileData?.data;

  const updateProfileMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      await apiClient.patch("/sellers/me", { description: newDescription });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      setIsEditingDescription(false);
    },
  });

  const handleEditDescription = useCallback(() => {
    setEditDescriptionValue(sellerData?.description || "");
    setIsEditingDescription(true);
  }, [sellerData?.description]);

  const handleSaveDescription = useCallback(() => {
    updateProfileMutation.mutate(editDescriptionValue);
  }, [editDescriptionValue, updateProfileMutation]);

  // Signing out drops the session and any cached seller data; worth one confirmation tap
  // rather than losing the screen to a mis-tap next to "Switch to Buyer App".
  const handleSignOut = useCallback(() => {
    Alert.alert("Sign out?", "You will need to log in again to manage your store.", [
      { text: "Stay signed in", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          useAuthStore.getState().setSession(null);
          router.replace("/");
        },
      },
    ]);
  }, [router]);

  const displayName = sellerData?.business_name || user?.user_metadata?.full_name || "OmniQ Seller";
  const status = statusTone(sellerData?.status, colors);

  return (
    <Screen bottomNavItems={SELLER_NAV_ITEMS}>
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : (
        <>
          <Surface style={styles.hero} elevation="md">
            <View style={styles.heroTop}>
              <Avatar name={displayName} size={58} />
              <View style={styles.heroText}>
                <Text style={styles.heroName} numberOfLines={2}>
                  {displayName}
                </Text>
                <Text style={styles.heroEmail} numberOfLines={1}>
                  {user?.email || "Seller account"}
                </Text>
              </View>
            </View>
            <View style={styles.heroBadges}>
              <StatusPill
                label={status.label}
                color={status.color}
                tint={withAlpha(status.color, 0.12)}
                icon={ShieldCheckIcon}
                size="md"
              />
              {sellerData?.category ? (
                <StatusPill
                  label={String(sellerData.category)}
                  color={colors.textSecondary}
                  tint={colors.bgTertiary}
                  icon={TagIcon}
                  size="md"
                />
              ) : null}
            </View>
          </Surface>

          <SectionHeader
            title="Your store"
            caption="What buyers see on your storefront"
            style={styles.sectionHeader}
          />
          <Surface style={styles.card}>
            <View style={styles.descriptionBlock}>
              <View style={styles.descriptionHeader}>
                <Text style={styles.descriptionLabel}>About the store</Text>
                {!isEditingDescription ? (
                  <Pressable onPress={handleEditDescription} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.editLink}>Edit</Text>
                  </Pressable>
                ) : null}
              </View>

              {isEditingDescription ? (
                <View>
                  <TextInput
                    style={styles.textInput}
                    value={editDescriptionValue}
                    onChangeText={setEditDescriptionValue}
                    placeholder="Tell buyers what you sell and what makes your store worth ordering from."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    autoFocus
                    maxLength={400}
                  />
                  <View style={styles.editActions}>
                    <Pressable
                      onPress={() => setIsEditingDescription(false)}
                      style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.ghostLabel}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveDescription}
                      disabled={updateProfileMutation.isPending}
                      style={({ pressed }) => [styles.solidBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.solidLabel}>
                        {updateProfileMutation.isPending ? "Saving…" : "Save"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={[styles.descriptionValue, !sellerData?.description && styles.descriptionEmpty]}>
                  {sellerData?.description || "No description yet — buyers trust stores that introduce themselves."}
                </Text>
              )}
            </View>

            <View style={styles.divider} />
            <InfoRow icon={StoreIcon} label="Business name" value={sellerData?.business_name} />
            <InfoRow icon={MapPinIcon} label="City" value={sellerData?.city} />
            <InfoRow icon={InfoIcon} label="GST number" value={sellerData?.gst_number} fallback="Not registered" />
          </Surface>

          <SectionHeader title="Contact" caption="Used for order and payout updates" style={styles.sectionHeader} />
          <Surface style={styles.card}>
            <InfoRow icon={MailIcon} label="Email" value={user?.email} />
            <InfoRow icon={PhoneIcon} label="Phone number" value={userProfile?.phone_number} />
            <InfoRow icon={MapPinIcon} label="Address" value={userProfile?.address} multiline />
            {userProfile?.pincode ? (
              <InfoRow icon={MapPinIcon} label="Pincode" value={String(userProfile.pincode)} />
            ) : null}
          </Surface>

          <View style={styles.actions}>
            <Link href="/(buyer)" asChild>
              <Button variant="secondary" icon={<SwapIcon size={17} color={colors.accent} strokeWidth={2.2} />}>
                Switch to buyer app
              </Button>
            </Link>
            <Button
              variant="secondary"
              onPress={handleSignOut}
              icon={<LogOutIcon size={17} color={colors.accent} strokeWidth={2.2} />}
            >
              Sign out
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    hero: { padding: SPACE.xl, gap: SPACE.lg },
    heroTop: { flexDirection: "row", alignItems: "center", gap: SPACE.lg },
    heroText: { flex: 1, minWidth: 0 },
    heroName: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
    heroEmail: { color: colors.textMuted, fontSize: 13, fontWeight: "500", marginTop: 3 },
    heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
    sectionHeader: { marginTop: SPACE.xxl, marginBottom: SPACE.md },
    card: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
    descriptionBlock: { paddingVertical: SPACE.md, gap: SPACE.sm },
    descriptionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    descriptionLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    editLink: { color: colors.accent, fontSize: 13.5, fontWeight: "700" },
    descriptionValue: { color: colors.textPrimary, fontSize: 14.5, fontWeight: "500", lineHeight: 21 },
    descriptionEmpty: { color: colors.textMuted, fontStyle: "italic" },
    textInput: {
      backgroundColor: colors.bgSecondary,
      color: colors.textPrimary,
      borderRadius: RADIUS.md,
      padding: SPACE.md,
      fontSize: 14,
      minHeight: 96,
      textAlignVertical: "top",
      borderColor: colors.border,
      borderWidth: 1,
    },
    editActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACE.sm, marginTop: SPACE.md },
    ghostBtn: { paddingVertical: 9, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.pill },
    ghostLabel: { color: colors.textSecondary, fontWeight: "700", fontSize: 13.5 },
    solidBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 9,
      paddingHorizontal: SPACE.xl,
      borderRadius: RADIUS.pill,
    },
    solidLabel: { color: "#FFFFFF", fontWeight: "800", fontSize: 13.5 },
    pressed: { opacity: 0.82 },
    divider: { height: 1, backgroundColor: colors.border },
    actions: { marginTop: SPACE.xxl, gap: SPACE.md },
  });
