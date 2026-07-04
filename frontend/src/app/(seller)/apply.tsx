import { useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";
import { useSellerStatus } from "@/hooks/useSellerStatus";

const applySchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  description: z.string().optional(),
  category: z.string().min(2, "Category is required"),
  gstNumber: z.string().min(10, "Valid GST number is required"),
  city: z.string().min(2, "City is required"),
});

type ApplyFormData = z.infer<typeof applySchema>;

export default function ApplySellerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { refetch } = useSellerStatus();

  const { control, handleSubmit, formState: { errors } } = useForm<ApplyFormData>({
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
        <Text style={styles.title}>Become a Seller</Text>
        <Text style={styles.subtitle}>Fill in your business details to apply for a seller account on OmniQ.</Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="businessName"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <Input placeholder="e.g. FreshMart Organics" value={value} onChangeText={onChange} />
              {errors.businessName && <Text style={styles.error}>{errors.businessName.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="gstNumber"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GST Number *</Text>
              <Input placeholder="e.g. 27ABCDE1234F1Z5" value={value} onChangeText={onChange} autoCapitalize="characters" />
              {errors.gstNumber && <Text style={styles.error}>{errors.gstNumber.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Primary Category *</Text>
              <Input placeholder="e.g. Electronics, Fashion" value={value} onChangeText={onChange} />
              {errors.category && <Text style={styles.error}>{errors.category.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <Input placeholder="e.g. Bengaluru" value={value} onChangeText={onChange} />
              {errors.city && <Text style={styles.error}>{errors.city.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Description</Text>
              <Input placeholder="Tell us about your products..." value={value} onChangeText={onChange} multiline numberOfLines={3} />
              {errors.description && <Text style={styles.error}>{errors.description.message}</Text>}
            </View>
          )}
        />

        <Button onPress={handleSubmit(onSubmit)} style={styles.submitBtn}>
          {loading ? "Submitting..." : "Submit Application"}
        </Button>
        <Button variant="secondary" onPress={() => router.back()} style={styles.backBtn}>
          Cancel
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 12,
  },
  backBtn: {
    marginTop: 12,
  }
});
