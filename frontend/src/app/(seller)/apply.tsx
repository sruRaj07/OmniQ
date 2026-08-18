/**
 * OmniQ mobile app - seller application form.
 *
 * Applying is the first thing a seller ever does in the app, so it leads with what they get
 * rather than with five empty boxes, and every field says why it is being asked for.
 *
 * Author: OmniQ Team
 */
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
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
import { useSellerStatus } from "@/hooks/useSellerStatus";
import { RADIUS, SPACE, withAlpha } from "@/constants/sellerTheme";
import { CheckIcon, StoreIcon } from "@/components/ui/SellerIcons";

const applySchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  description: z.string().optional(),
  category: z.string().min(2, "Category is required"),
  gstNumber: z.string().min(10, "Valid GST number is required"),
  city: z.string().min(2, "City is required")
});
type ApplyFormData = z.infer<typeof applySchema>;

const BENEFITS = [
  "List unlimited products with photo optimisation built in",
  "Get paid for every delivered order, tracked in the app",
  "Manage packing and dispatch from your phone",
];

export default function ApplySellerScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { refetch } = useSellerStatus();
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

  const onSubmit = async (data: ApplyFormData) => {
    setLoading(true);
    try {
      await apiClient.post("/sellers/register", data);
      await refetch();
      Alert.alert("Success", "Your application has been submitted!");
      router.replace("/(seller)/pending" as any);
    } catch (error: any) {
      Alert.alert("Application Failed", error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

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
  });
