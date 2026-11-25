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
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
import { confirmAction, notify } from "@/utils/dialog";
import { fetchCurrentLocation } from "@/utils/location";
import { LocationPickerModal, type SelectedLocationData } from "@/components/shared/LocationPickerModal";
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

function distanceKm(point: { lat: number; lng: number }, centre: { lat: number; lng: number }): number {
  const toRad = (value: number): number => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(centre.lat - point.lat);
  const dLng = toRad(centre.lng - point.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point.lat)) * Math.cos(toRad(centre.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  const hasCoordinates =
    sellerData?.lat !== null &&
    sellerData?.lat !== undefined &&
    sellerData?.lng !== null &&
    sellerData?.lng !== undefined &&
    Number(sellerData?.lat) !== 0 &&
    Number(sellerData?.lng) !== 0;

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [assigningWarehouse, setAssigningWarehouse] = useState(false);

  const handleLocationSelected = useCallback(
    async (loc: SelectedLocationData) => {
      try {
        const payload: any = { lat: loc.lat, lng: loc.lng };
        if (loc.city) payload.city = loc.city;
        const res = await apiClient.patch("/sellers/me", payload);
        queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
        const wh = res?.data?.data?.assigned_warehouse;
        if (wh) {
          notify(
            "Store Location Set",
            `Location set to ${loc.formattedAddress}. Automatically linked to ${wh.name}!`
          );
        } else {
          notify(
            "Store Location Set",
            `Location set to ${loc.formattedAddress}. Tap "Connect to Nearest Warehouse" to link your hub.`
          );
        }
      } catch (err: any) {
        notify("Save Failed", err?.response?.data?.message || err?.message || "Could not save store location.");
      }
    },
    [queryClient]
  );

  const handleConnectNearestWarehouse = useCallback(async () => {
    if (!hasCoordinates) {
      notify("Location Required", "Please set your store location first so we can find your nearest fulfillment hub.");
      setShowLocationPicker(true);
      return;
    }

    const lat = Number(sellerData.lat);
    const lng = Number(sellerData.lng);

    setAssigningWarehouse(true);
    try {
      const res = await apiClient.patch("/sellers/me", { lat, lng });
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      const wh = res?.data?.data?.assigned_warehouse;
      if (wh) {
        const whLat = Number(wh.lat);
        const whLng = Number(wh.lng);
        let distText = "";
        if (!isNaN(whLat) && !isNaN(whLng) && (whLat !== 0 || whLng !== 0)) {
          const d = distanceKm({ lat, lng }, { lat: whLat, lng: whLng });
          distText = ` (~${d.toFixed(1)} km away)`;
        }
        notify(
          "Warehouse Connected!",
          `Your store is now linked to ${wh.name}${distText}. Customer orders will be fulfilled through this hub.`
        );
      } else {
        notify("Warehouse Connected", "Your store is now linked to your nearest fulfillment hub.");
      }
    } catch (err: any) {
      notify("Connection Failed", err?.response?.data?.message || err?.message || "Could not link nearest warehouse.");
    } finally {
      setAssigningWarehouse(false);
    }
  }, [hasCoordinates, sellerData, queryClient]);

  const handleEditDescription = useCallback(() => {
    setEditDescriptionValue(sellerData?.description || "");
    setIsEditingDescription(true);
  }, [sellerData?.description]);

  const handleSaveDescription = useCallback(() => {
    updateProfileMutation.mutate(editDescriptionValue);
  }, [editDescriptionValue, updateProfileMutation]);

  // Signing out drops the session and any cached seller data; worth one confirmation tap
  // rather than losing the screen to a mis-tap next to "Switch to Buyer App".
  //
  // This used to call Alert.alert directly, which is a no-op on react-native-web: the prompt
  // never rendered, so its onPress never fired and the button read as dead. confirmAction picks
  // window.confirm on web and Alert.alert on device.
  const handleSignOut = useCallback(() => {
    confirmAction(
      "Sign out?",
      "You will need to log in again to manage your store.",
      async () => {
        // Clear local session even if the network call fails - otherwise a seller on a bad
        // connection stays logged in with no feedback. Supabase clears its own storage locally.
        try {
          await supabase.auth.signOut();
        } catch {
          // ignored on purpose; the local clear below is what actually signs them out here
        }
        useAuthStore.getState().setSession(null);
        queryClient.clear();
        router.replace("/");
      },
      { confirmLabel: "Sign out", destructive: true }
    );
  }, [router, queryClient]);

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
            <View style={styles.divider} />

            {/* Store Physical Location Section */}
            <View style={styles.locationSection}>
              <View style={styles.locationHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionSublabel}>Store Physical Location</Text>
                  <Text style={[styles.locationCoordText, !hasCoordinates && styles.locationCoordEmpty]}>
                    {hasCoordinates
                      ? `📍 ${sellerData?.city ? `${sellerData.city} · ` : ""}${Number(sellerData?.lat).toFixed(4)}° N, ${Number(sellerData?.lng).toFixed(4)}° E`
                      : "Location not set yet"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowLocationPicker(true)}
                  style={({ pressed }) => [styles.locationEditBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.locationEditBtnText}>
                    {hasCoordinates ? "Change on Map" : "Pick on Map"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Warehouse Connection Section */}
            <View style={styles.warehouseSection}>
              <Text style={styles.sectionSublabel}>Fulfillment Warehouse Hub</Text>
              {sellerData?.assigned_warehouse || sellerData?.assigned_warehouse_id ? (
                <View style={styles.whConnectedCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.whConnectedName}>
                        {sellerData.assigned_warehouse?.name || "Assigned Fulfillment Hub"}
                      </Text>
                      <View style={styles.connectedBadge}>
                        <Text style={styles.connectedBadgeText}>CONNECTED</Text>
                      </View>
                    </View>
                    {hasCoordinates && sellerData.assigned_warehouse?.lat && sellerData.assigned_warehouse?.lng && (Number(sellerData.assigned_warehouse.lat) !== 0 || Number(sellerData.assigned_warehouse.lng) !== 0) ? (
                      (() => {
                        const dist = distanceKm(
                          { lat: Number(sellerData.lat), lng: Number(sellerData.lng) },
                          { lat: Number(sellerData.assigned_warehouse.lat), lng: Number(sellerData.assigned_warehouse.lng) }
                        );
                        if (dist > 150) {
                          return (
                            <Text style={styles.whDistanceText}>
                              📍 Assigned to {sellerData.assigned_warehouse?.name}. Tap "Re-link" after calibrating warehouse on Google Maps.
                            </Text>
                          );
                        }
                        return (
                          <Text style={styles.whDistanceText}>
                            📍 Calculated distance: ~{dist.toFixed(1)} km from your store
                          </Text>
                        );
                      })()
                    ) : (
                      <Text style={styles.whDistanceText}>Dispatches and deliveries handled via this hub.</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={handleConnectNearestWarehouse}
                    disabled={assigningWarehouse}
                    style={({ pressed }) => [styles.reconnectBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.reconnectBtnText}>
                      {assigningWarehouse ? "Linking…" : "Re-link"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.whUnassignedText}>
                    {hasCoordinates
                      ? "Store location is set. Connect to calculate physical distance and assign your nearest fulfillment hub."
                      : "No warehouse assigned yet. Pick your store location on the map first so we can connect to your nearest hub."}
                  </Text>
                  <Pressable
                    onPress={hasCoordinates ? handleConnectNearestWarehouse : () => setShowLocationPicker(true)}
                    disabled={assigningWarehouse}
                    style={({ pressed }) => [
                      styles.whConnectBtn,
                      pressed && styles.pressed,
                      assigningWarehouse && styles.disabled
                    ]}
                  >
                    <Text style={styles.whConnectBtnText}>
                      {assigningWarehouse
                        ? "Calculating distance & connecting…"
                        : hasCoordinates
                        ? "📍 Connect to Nearest Warehouse"
                        : "📍 Step 1: Pick Store Location on Map"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
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
          <LocationPickerModal
            visible={showLocationPicker}
            title="Set Store Location"
            subtitle="Search shop address or use GPS to link nearest hub"
            initialLocation={
              hasCoordinates
                ? {
                    lat: Number(sellerData.lat),
                    lng: Number(sellerData.lng),
                    address: sellerData.city,
                  }
                : undefined
            }
            onClose={() => setShowLocationPicker(false)}
            onSelect={handleLocationSelected}
          />
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
    whLinkBtn: {
      marginVertical: SPACE.sm,
      paddingVertical: 10,
      paddingHorizontal: SPACE.md,
      backgroundColor: withAlpha(colors.accent, 0.1),
      borderColor: withAlpha(colors.accent, 0.3),
      borderWidth: 1,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center"
    },
    whLinkText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "700"
    },
    locationSection: {
      paddingVertical: SPACE.md,
      gap: SPACE.xs
    },
    locationHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACE.sm
    },
    sectionSublabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginBottom: 3
    },
    locationCoordText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700"
    },
    locationCoordEmpty: {
      color: colors.textMuted,
      fontWeight: "500",
      fontStyle: "italic"
    },
    locationEditBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.sm,
      backgroundColor: withAlpha(colors.accent, 0.1),
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.3)
    },
    locationEditBtnText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "700"
    },
    locationEditBox: {
      marginTop: SPACE.sm,
      padding: SPACE.md,
      backgroundColor: colors.bgSecondary,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: SPACE.sm
    },
    locationHelperText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 16
    },
    gpsDetectBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: SPACE.md,
      borderRadius: RADIUS.sm
    },
    gpsDetectBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700"
    },
    coordsRow: {
      flexDirection: "row",
      gap: SPACE.sm
    },
    inputMiniLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      marginBottom: 4
    },
    coordInput: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACE.sm,
      paddingVertical: 8,
      fontSize: 13,
      borderWidth: 1,
      borderColor: colors.border
    },
    locationEditActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: SPACE.sm,
      marginTop: 4
    },
    warehouseSection: {
      paddingVertical: SPACE.md,
      gap: SPACE.xs
    },
    whConnectedCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACE.sm,
      padding: SPACE.md,
      backgroundColor: withAlpha(colors.success || "#16A34A", 0.08),
      borderColor: withAlpha(colors.success || "#16A34A", 0.25),
      borderWidth: 1,
      borderRadius: RADIUS.md,
      marginTop: 4
    },
    whConnectedName: {
      color: colors.textPrimary,
      fontSize: 14.5,
      fontWeight: "800"
    },
    connectedBadge: {
      backgroundColor: withAlpha(colors.success || "#16A34A", 0.15),
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4
    },
    connectedBadgeText: {
      color: colors.success || "#16A34A",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5
    },
    whDistanceText: {
      color: colors.textSecondary,
      fontSize: 12.5,
      marginTop: 3,
      fontWeight: "500"
    },
    reconnectBtn: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    reconnectBtnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "700"
    },
    whUnassignedText: {
      color: colors.textMuted,
      fontSize: 12.5,
      lineHeight: 18,
      marginBottom: 6
    },
    whConnectBtn: {
      paddingVertical: 12,
      paddingHorizontal: SPACE.md,
      backgroundColor: colors.accent,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center"
    },
    whConnectBtnText: {
      color: "#FFFFFF",
      fontSize: 13.5,
      fontWeight: "700"
    },
    disabled: {
      opacity: 0.6
    },
    actions: { marginTop: SPACE.xxl, gap: SPACE.md },
  });
