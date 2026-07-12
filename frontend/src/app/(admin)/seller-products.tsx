/**
 * OmniQ mobile app - admin seller products moderation.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { ArrowLeftIcon } from "@/components/ui/ArrowLeftIcon";
import { apiClient } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";
import { LinearGradient } from "expo-linear-gradient";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
export default function AdminSellerProductsScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const {
    sellerId,
    storeName
  } = useLocalSearchParams<{
    sellerId: string;
    storeName: string;
  }>();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const {
    data: products,
    isLoading
  } = useQuery({
    queryKey: ["adminSellerProducts", sellerId],
    queryFn: async () => {
      const res = await apiClient.get(`/products?sellerId=${sellerId}`);
      return res.data.data;
    },
    enabled: !!sellerId
  }, queryClient);
  const moderateProduct = useMutation({
    mutationFn: async ({
      id,
      action
    }: {
      id: string;
      action: string;
    }) => {
      await apiClient.patch(`/admin/products/${id}/moderate`, {
        action
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminSellerProducts", sellerId]
      });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  }, queryClient);
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <Screen scroll>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeftIcon size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>{storeName || "Seller"} Products</Text>
      <Text style={styles.subtitle}>Review and approve inventory</Text>

      {isLoading ? <ActivityIndicator size="large" color="#6C63FF" style={{
      marginTop: 40
    }} /> : products?.length === 0 ? <View style={styles.emptyState}>
          <ShieldIcon size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>No products found for this seller.</Text>
        </View> : <View style={styles.list}>
          {products?.map((product: any) => {
        const isExpanded = expandedId === product.id;
        return <TouchableOpacity key={product.id} activeOpacity={0.9} onPress={() => setExpandedId(isExpanded ? null : product.id)}>
                <LinearGradient colors={["rgba(30, 30, 45, 0.7)", "rgba(15, 15, 26, 0.9)"]} start={{
            x: 0,
            y: 0
          }} end={{
            x: 1,
            y: 1
          }} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.productName} numberOfLines={isExpanded ? undefined : 2}>
                      {product.title}
                    </Text>
                    <View style={[styles.statusBadge, product.is_approved ? styles.badgeSuccess : styles.badgeWarning]}>
                      <Text style={[styles.badgeText, product.is_approved ? {
                  color: "#4CAF50"
                } : {
                  color: "#FFC107"
                }]}>
                        {product.is_approved ? "APPROVED" : "PENDING"}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.price}>{formatCurrency(product.price)}</Text>
                  
                  <Text style={styles.mutedText} numberOfLines={isExpanded ? undefined : 2}>
                    {product.description}
                  </Text>
                  
                  {product.images && product.images.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                      {product.images.map((uri: string, idx: number) => <Image key={idx} source={{
                uri
              }} style={styles.image} />)}
                    </ScrollView>}

                  {isExpanded && <View style={styles.expandedInfo}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Product ID:</Text>
                        <Text style={styles.infoValue} selectable>{product.id}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Category:</Text>
                        <Text style={styles.infoValue}>{product.category_id || "Uncategorized"}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Stock Available:</Text>
                        <Text style={styles.infoValue}>{product.stock_quantity ?? "0"} units</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Added On:</Text>
                        <Text style={styles.infoValue}>{formatDate(product.created_at)}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Last Updated:</Text>
                        <Text style={styles.infoValue}>{formatDate(product.updated_at)}</Text>
                      </View>
                    </View>}

                  <View style={styles.actions}>
                    {!product.is_approved && <TouchableOpacity style={[styles.button, styles.btnSuccess]} onPress={() => moderateProduct.mutate({
                id: product.id,
                action: "approve"
              })}>
                        <Text style={[styles.btnText, {
                  color: "#4CAF50"
                }]}>Approve</Text>
                      </TouchableOpacity>}
                    <TouchableOpacity style={[styles.button, styles.btnDanger]} onPress={() => moderateProduct.mutate({
                id: product.id,
                action: "remove"
              })}>
                      <Text style={[styles.btnText, {
                  color: "#F93C65"
                }]}>Reject / Delete</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>;
      })}
        </View>}
      <View style={{
      height: 60
    }} />
    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
    alignSelf: "flex-start"
  },
  backText: {
    color: "#6C63FF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5
  },
  title: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -0.5
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 24
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600"
  },
  list: {
    gap: 16
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  productName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
    marginRight: 12,
    lineHeight: 24
  },
  price: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12
  },
  mutedText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: "500"
  },
  imageScroll: {
    flexDirection: "row",
    marginBottom: 16,
    marginHorizontal: -4
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1
  },
  badgeSuccess: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "rgba(76, 175, 80, 0.3)"
  },
  badgeWarning: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderColor: "rgba(255, 193, 7, 0.3)"
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  expandedInfo: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)"
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4
  },
  infoLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "700"
  },
  infoValue: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 16
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  btnSuccess: {
    backgroundColor: "rgba(76, 175, 80, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.2)"
  },
  btnDanger: {
    backgroundColor: "rgba(249, 60, 101, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(249, 60, 101, 0.2)"
  },
  btnText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  }
});