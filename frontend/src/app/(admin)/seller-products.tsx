/**
 * OmniQ mobile app - admin seller products moderation.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";

export default function AdminSellerProductsScreen() {
  const { sellerId, storeName } = useLocalSearchParams<{ sellerId: string; storeName: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { data: products, isLoading } = useQuery({
    queryKey: ["adminSellerProducts", sellerId],
    queryFn: async () => {
      const res = await apiClient.get(`/products?sellerId=${sellerId}`);
      return res.data.data;
    },
    enabled: !!sellerId
  });

  const moderateProduct = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await apiClient.patch(`/admin/products/${id}/moderate`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSellerProducts", sellerId] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  });

  return (
    <Screen scroll>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back to Sellers</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{storeName || "Seller"} Products</Text>
      <Text style={styles.subtitle}>Review and approve inventory</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : products?.length === 0 ? (
        <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No products found for this seller.</Text>
      ) : (
        <View style={styles.list}>
          {products?.map((product: any) => (
            <View key={product.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.productName}>{product.title}</Text>
                <View style={[styles.badge, product.is_approved ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={styles.badgeText}>{product.is_approved ? "Approved" : "Pending"}</Text>
                </View>
              </View>
              
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
              <Text style={styles.mutedText} numberOfLines={2}>{product.description}</Text>
              
              {product.images && product.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                  {product.images.map((uri: string, idx: number) => (
                    <Image key={idx} source={{ uri }} style={styles.image} />
                  ))}
                </ScrollView>
              )}

              <View style={styles.actions}>
                {!product.is_approved && (
                  <TouchableOpacity style={[styles.button, styles.btnSuccess]} onPress={() => moderateProduct.mutate({ id: product.id, action: "approve" })}>
                    <Text style={styles.btnText}>Approve</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.button, styles.btnDanger]} onPress={() => moderateProduct.mutate({ id: product.id, action: "remove" })}>
                  <Text style={styles.btnText}>Reject / Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginBottom: 16,
    paddingVertical: 8
  },
  backText: {
    color: colors.accentLight,
    fontWeight: "700",
    fontSize: 16
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4
  },
  productName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    marginRight: 8
  },
  price: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20
  },
  imageScroll: {
    flexDirection: "row",
    marginBottom: 16
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: colors.bgSecondary
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeSuccess: { backgroundColor: "rgba(46, 204, 113, 0.2)" },
  badgeWarning: { backgroundColor: "rgba(241, 196, 15, 0.2)" },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
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
