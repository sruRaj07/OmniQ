/**
 * OmniQ mobile app - admin moderation screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/shared/Screen";
import { BarIcon } from "@/components/ui/BarIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";

export default function AdminModerationScreen() {
  const queryClient = useQueryClient();
  
  const { data: products, isLoading } = useQuery({
    queryKey: ["adminFlaggedProducts"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/flagged-products");
      return res.data.data;
    },
  });

  const moderateProduct = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await apiClient.patch(`/admin/products/${id}/moderate`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFlaggedProducts"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  });

  return (
    <>
      <Screen scroll>
        <Text style={styles.title}>Product Moderation</Text>
        <Text style={styles.subtitle}>Review flagged items</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : products?.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No flagged products to review.</Text>
        ) : (
          <View style={styles.list}>
            {products?.map((product: any) => (
              <View key={product.id} style={styles.card}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.mutedText}>Seller ID: {product.seller_id.substring(0, 8)}</Text>
                
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.button, styles.btnSuccess]} onPress={() => moderateProduct.mutate({ id: product.id, action: "approve" })}>
                    <Text style={styles.btnText}>Allow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.btnDanger]} onPress={() => moderateProduct.mutate({ id: product.id, action: "remove" })}>
                    <Text style={styles.btnText}>Remove</Text>
                  </TouchableOpacity>
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
  productName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16
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
  btnText: {
    color: colors.textPrimary,
    fontWeight: "800"
  }
});
