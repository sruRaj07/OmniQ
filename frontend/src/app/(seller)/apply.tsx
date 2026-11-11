/**
 * OmniQ mobile app - seller application form.
 *
 * Applying is the first thing a seller ever does in the app, so it leads with what they get
 * rather than with five empty boxes, and every field says why it is being asked for.
 *
 * Author: OmniQ Team
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { Surface } from "@/components/seller/SellerUI";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { sellerProfileOf, useSellerStatus } from "@/hooks/useSellerStatus";
import { RADIUS, SPACE, withAlpha } from "@/constants/sellerTheme";
import { CheckIcon, MapPinIcon, StoreIcon } from "@/components/ui/SellerIcons";

/** Where an existing seller account belongs, given its approval state. */
function routeForSeller(profile: Record<string, any>): string {
  const status = String(profile.status ?? "").toLowerCase();
  return status === "approved" || status === "active" ? "/(seller)/dashboard" : "/(seller)/pending";
}

const applySchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  description: z.string().optional(),
  category: z.string().min(2, "Category is required"),
  gstNumber: z.string().min(10, "Valid GST number is required"),
  city: z.string().min(2, "City is required"),
  lat: z.number().optional(),
  lng: z.number().optional()
});
type ApplyFormData = z.infer<typeof applySchema>;

const BENEFITS = [
  "List unlimited products with photo optimisation built in",
  "Auto-assigned to nearest warehouse for fast local deliveries",
  "Get paid for every delivered order, tracked in the app",
  "Manage packing and dispatch from your phone",
];

export default function ApplySellerScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [locStatus, setLocStatus] = useState<"idle" | "detecting" | "detected" | "denied">("idle");
  const { sellerProfile, isUnresolved, isError, isFetching, refetch } = useSellerStatus();

  // Last line of defence: this screen re-checks with the server on mount, so a seller who was
  // routed here in error is sent to their store instead of being asked to apply twice.
  useEffect(() => {
    if (sellerProfile) {
      router.replace(routeForSeller(sellerProfile) as any);
    }
  }, [sellerProfile, router]);

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ApplyFormData>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      businessName: "",
      description: "",
      category: "",
      gstNumber: "",
      city: ""
    }
  });

  const handleRequestLocation = useCallback(() => {
    setLocStatus("detecting");
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setCoords({ lat, lng });
          setLocStatus("detected");
        },
        (err) => {
          console.warn("Location error:", err);
          setLocStatus("denied");
          Alert.alert(
            "Location Permission",
            "Could not detect exact GPS coordinates. OmniQ will match your store to the nearest fulfillment warehouse using your city."
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocStatus("denied");
      Alert.alert(
        "Location Unavailable",
        "GPS is not supported on this device. We will automatically assign your nearest warehouse using your city."
      );
    }
  }, []);

  const onSubmit = async (data: ApplyFormData) => {
    setLoading(true);
    try {
      const payload: any = { ...data };
      if (coords.lat !== undefined && coords.lng !== undefined) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      }
      await apiClient.post("/sellers/register", payload);
      await refetch();
      Alert.alert("Success", "Your application has been submitted and assigned to your nearest fulfillment warehouse!");
      router.replace("/(seller)/pending" as any);
    } catch (error: any) {
      const payload = error?.response?.data?.error ?? error?.response?.data;
      const code = payload?.code;
      const message = payload?.message || error?.message || "Something went wrong.";

      // sellers.owner_id is unique, so this means the account already exists — the user was
      // shown this form by mistake. Send them to their store rather than leaving them stuck on
      // a duplicate-key error. The raw-text check keeps this working against a gateway that
      // has not been redeployed with the SELLER_ALREADY_EXISTS code yet.
      const alreadyExists =
        code === "SELLER_ALREADY_EXISTS" ||
        /duplicate key|already exists|sellers_owner_id/i.test(String(message));

      if (alreadyExists) {
        const refreshed = sellerProfileOf((await refetch()).data);
        Alert.alert(
          "You already have a seller account",
          "We found the seller account linked to this email and opened it for you."
        );
        router.replace((refreshed ? routeForSeller(refreshed) : "/(seller)/pending") as any);
        return;
      }

      Alert.alert("Application Failed", message);
    } finally {
      setLoading(false);
    }
  };


  // The application form is only correct for someone the server has confirmed has no seller
  // account. Until then this screen shows its own state rather than guessing — showing the
  // form on an unanswered or failed check is what made existing sellers re-apply.
  if (isError && isUnresolved) {
    return (
      <Screen scroll={false}>
        <View style={styles.gate}>
          <Text style={styles.gateTitle}>Couldn&apos;t check your account</Text>
          <Text style={styles.gateText}>
            We couldn&apos;t reach OmniQ to see whether you already sell with us. If you have a
            seller account, applying again won&apos;t work — please retry instead.
          </Text>
          <Button onPress={() => refetch()} loading={isFetching} disabled={isFetching}>
            Try again
          </Button>
        </View>
      </Screen>
    );
  }

  if (isUnresolved || sellerProfile) {
    return (
      <Screen scroll={false}>
        <View style={styles.gate}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.gateText}>Checking your seller account…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={true}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <StoreIcon size={20} color={colors.accent} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Sell on OmniQ</Text>
        <Text style={styles.subtitle}>
          Tell us about your business. Applications are reviewed by our team, usually within 24–48 hours.
        </Text>
      </View>

      <Surface style={styles.benefits} elevation="none">
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.benefitTick}>
              <CheckIcon size={12} color={colors.success} strokeWidth={3} />
            </View>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </Surface>

      <Surface style={styles.form} elevation="sm">
        <Controller
          control={control}
          name="businessName"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Business name</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <Input placeholder="e.g. FreshMart Organics" value={value} onChangeText={onChange} />
              <Text style={styles.hint}>This is the store name buyers will see.</Text>
              {errors.businessName ? <Text style={styles.error}>{errors.businessName.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="gstNumber"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>GST number</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <Input
                placeholder="27ABCDE1234F1Z5"
                value={value}
                onChangeText={onChange}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.hint}>Required to receive payouts. Never shown to buyers.</Text>
              {errors.gstNumber ? <Text style={styles.error}>{errors.gstNumber.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Primary category</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <Input placeholder="e.g. Grocery, Kitchen" value={value} onChangeText={onChange} />
              <Text style={styles.hint}>What you mostly sell. You can list across categories later.</Text>
              {errors.category ? <Text style={styles.error}>{errors.category.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>City</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <Input placeholder="e.g. Bengaluru" value={value} onChangeText={onChange} />
              <Text style={styles.hint}>We use this to match you with nearby buyers.</Text>
              {errors.city ? <Text style={styles.error}>{errors.city.message}</Text> : null}
            </View>
          )}
        />

        {/* Amazon-style Inventory / Dispatch location for warehouse assignment */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={styles.locationIconWrap}>
              <MapPinIcon size={18} color={colors.accent} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Dispatch / Inventory Location</Text>
              <Text style={styles.locationSubtitle}>
                Where you store and pack items. Based on this, you will be assigned the nearest fulfillment warehouse or hub.
              </Text>
            </View>
          </View>

          {locStatus === "detected" && coords.lat !== undefined ? (
            <View style={styles.locationSuccess}>
              <CheckIcon size={14} color={colors.success} strokeWidth={3} />
              <Text style={styles.locationSuccessText}>
                Coordinates set ({coords.lat}, {coords.lng}) · Nearest warehouse will be linked
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleRequestLocation}
              disabled={locStatus === "detecting"}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.locationBtn,
                locStatus === "detecting" && styles.locationBtnDisabled,
                pressed && styles.pressed
              ]}
            >
              {locStatus === "detecting" ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <MapPinIcon size={16} color={colors.accent} strokeWidth={2.4} />
              )}
              <Text style={styles.locationBtnText}>
                {locStatus === "detecting" ? "Detecting location…" : "Detect My Inventory Location (GPS)"}
              </Text>
            </Pressable>
          )}
        </View>


        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Business description</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>
              <Input
                placeholder="Tell us about your products…"
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />
              {errors.description ? <Text style={styles.error}>{errors.description.message}</Text> : null}
            </View>
          )}
        />

        <View style={styles.actions}>
          <Button onPress={handleSubmit(onSubmit)} loading={loading} disabled={loading}>
            Submit application
          </Button>
          <Button
            variant="secondary"
            disabled={loading}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/login" as any))}
          >
            Cancel
          </Button>
        </View>
      </Surface>
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    gate: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACE.md, paddingHorizontal: SPACE.lg },
    gateTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", textAlign: "center" },
    gateText: { color: colors.textSecondary, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
    header: { marginBottom: SPACE.xl },
    badge: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: withAlpha(colors.accent, 0.12),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACE.md,
    },
    title: { color: colors.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
    subtitle: { color: colors.textSecondary, fontSize: 14.5, lineHeight: 21, marginTop: SPACE.sm },
    benefits: {
      backgroundColor: colors.bgSecondary,
      padding: SPACE.lg,
      gap: SPACE.md,
      marginBottom: SPACE.xl,
    },
    benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md },
    benefitTick: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: withAlpha(colors.success, 0.14),
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    benefitText: { flex: 1, color: colors.textSecondary, fontSize: 13.5, fontWeight: "500", lineHeight: 19 },
    form: { padding: SPACE.xl, marginBottom: SPACE.xxxl, gap: SPACE.lg },
    inputGroup: { gap: SPACE.sm },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginLeft: 2 },
    label: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    required: { color: colors.danger, fontSize: 13, fontWeight: "900" },
    optional: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
    hint: { color: colors.textMuted, fontSize: 11.5, fontWeight: "500", marginLeft: 2 },
    textArea: { minHeight: 96, textAlignVertical: "top", paddingTop: 16, paddingBottom: 16 },
    error: { color: colors.danger, fontSize: 11.5, fontWeight: "700", marginLeft: 2 },
    actions: { gap: SPACE.md, marginTop: SPACE.sm },
    pressed: { opacity: 0.8 },
    locationCard: {
      backgroundColor: colors.bgSecondary,
      borderRadius: RADIUS.md,
      padding: SPACE.md,
      gap: SPACE.sm,
      borderWidth: 1,
      borderColor: colors.border
    },
    locationHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACE.sm
    },
    locationIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: withAlpha(colors.accent, 0.12),
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2
    },
    locationTitle: {
      color: colors.textPrimary,
      fontSize: 13.5,
      fontWeight: "800"
    },
    locationSubtitle: {
      color: colors.textMuted,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 2
    },
    locationBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.xs,
      backgroundColor: withAlpha(colors.accent, 0.08),
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.3),
      borderRadius: RADIUS.sm,
      paddingVertical: 10,
      paddingHorizontal: SPACE.md,
      marginTop: SPACE.xs
    },
    locationBtnDisabled: {
      opacity: 0.6
    },
    locationBtnText: {
      color: colors.accent,
      fontSize: 12.5,
      fontWeight: "700"
    },
    locationSuccess: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.xs,
      backgroundColor: withAlpha(colors.success, 0.1),
      borderColor: withAlpha(colors.success, 0.3),
      borderWidth: 1,
      borderRadius: RADIUS.sm,
      paddingVertical: 8,
      paddingHorizontal: SPACE.md,
      marginTop: SPACE.xs
    },
    locationSuccessText: {
      color: colors.success,
      fontSize: 12,
      fontWeight: "700",
      flex: 1
    }
  });

