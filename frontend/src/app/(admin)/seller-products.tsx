/**
 * OmniQ mobile app - admin seller products moderation.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Platform, Modal } from "react-native";
import { Image } from "expo-image";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { ArrowLeftIcon } from "@/components/ui/ArrowLeftIcon";
import { apiClient } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { CategorySvgIcon } from "@/components/ui/CategorySvgIcon";
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
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [loadingAction, setLoadingAction] = useState<{ id: string; action: string } | null>(null);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);

  const triggerSuccessAnimation = (msg: string) => {
    setSuccessMessage(msg);
    setShowSuccess(true);
    opacityAnim.value = withTiming(1, { duration: 300 });
    scaleAnim.value = withSpring(1, { damping: 10, stiffness: 50 }, () => {
      setTimeout(() => {
        runOnJS(setShowSuccess)(false);
      }, 2000);
    });
  };

  const successAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
    transform: [{ scale: scaleAnim.value }]
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value
  }));

  const {
    data: products,
    isLoading
  } = useQuery({
    queryKey: ["adminSellerProducts", sellerId],
    queryFn: async () => {
      const res = await apiClient.get(`/products?sellerId=${sellerId}&limit=500`);
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
      return { id, action };
    },
    onMutate: (variables) => {
      setLoadingAction(variables);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["adminSellerProducts", sellerId]
      });
      setLoadingAction(null);
      
      const msg = variables.action === "approve" ? "Approved successfully" : 
                  variables.action === "remove" ? "Rejected successfully" : 
                  "Deleted successfully";
                  
      triggerSuccessAnimation(msg);
    },
    onError: (err: any) => {
      setLoadingAction(null);
      const msg = err?.response?.data?.message || err.message;
      if (Platform.OS === "web") {
        window.alert(`Failed to update: ${msg}`);
      } else {
        Alert.alert("Failed to update", msg);
      }
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
      <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/(admin)/sellers")} style={styles.backButton}>
        <ArrowLeftIcon size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>{storeName || "Seller"} Products</Text>
      <Text style={styles.subtitle}>Review and approve inventory</Text>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <Text style={[styles.tabText, activeTab === "pending" && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "approved" && styles.activeTab]}
          onPress={() => setActiveTab("approved")}
        >
          <Text style={[styles.tabText, activeTab === "approved" && styles.activeTabText]}>Approved</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#6C63FF" style={{
      marginTop: 40
    }} /> : (products?.filter((p: any) => (activeTab === "approved" ? p.is_approved : !p.is_approved)).length === 0) ? <View style={styles.emptyState}>
          <ShieldIcon size={48} color="rgba(0,0,0,0.05)" />
          <Text style={styles.emptyText}>No {activeTab} products found.</Text>
        </View> : <View style={styles.list}>
          {products?.filter((p: any) => (activeTab === "approved" ? p.is_approved : !p.is_approved)).map((product: any) => {
        const isExpanded = expandedId === product.id;
        const isApproving = loadingAction?.id === product.id && loadingAction?.action === "approve";
        const isRejecting = loadingAction?.id === product.id && loadingAction?.action === "remove";
        const isDeleting = loadingAction?.id === product.id && loadingAction?.action === "delete";
        const isProcessing = isApproving || isRejecting || isDeleting;

        return <TouchableOpacity key={product.id} activeOpacity={0.9} onPress={() => setExpandedId(isExpanded ? null : product.id)}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={isExpanded ? undefined : 2}>
                      {product.title}
                    </Text>
                    <View style={styles.badgeGroup}>
                      {(product.category || product.category_id) ? (
                        <View style={[styles.categoryBadge, { borderColor: colors.border }]}>
                          <CategorySvgIcon category={product.category || product.category_id || ""} size={12} showBackground={false} style={{ marginRight: 4 }} />
                          <Text style={[styles.categoryBadgeText, { color: colors.textSecondary }]}>
                            #{String(product.category || product.category_id).toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.statusBadge, product.is_approved ? { borderColor: colors.success } : { borderColor: colors.warning }]}>
                        <Text style={[styles.badgeText, product.is_approved ? { color: colors.success } : { color: colors.warning }]}>
                          {product.is_approved ? "✓ APPROVED" : "⏳ PENDING"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <Text style={[styles.price, { color: colors.textPrimary }]}>{formatCurrency(product.price)}</Text>
                  
                  <Text style={styles.mutedText} numberOfLines={isExpanded ? undefined : 2}>
                    {product.description}
                  </Text>
                  
                  {product.images && product.images.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                      {product.images.map((uri: string, idx: number) => <Image key={idx} source={uri} style={styles.image} contentFit="cover" transition={150} />)}
                    </ScrollView>}

                  {isExpanded && <View style={[styles.expandedInfo, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
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
                    {!product.is_approved && <TouchableOpacity disabled={isProcessing} style={[styles.button, styles.btnSuccess]} onPress={() => moderateProduct.mutate({
                id: product.id,
                action: "approve"
              })}>
                        {isApproving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.btnText, { color: "#FFF" }]}>Approve</Text>}
                      </TouchableOpacity>}
                      
                    <TouchableOpacity disabled={isProcessing} style={[styles.button, styles.btnWarningBtn]} onPress={() => moderateProduct.mutate({
                id: product.id,
                action: "remove"
              })}>
                      {isRejecting ? <ActivityIndicator size="small" color="#F57C00" /> : <Text style={[styles.btnText, { color: "#F57C00" }]}>Reject</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity disabled={isProcessing} style={[styles.button, styles.btnDanger]} onPress={() => moderateProduct.mutate({
                id: product.id,
                action: "delete"
              })}>
                      {isDeleting ? <ActivityIndicator size="small" color="#F93C65" /> : <Text style={[styles.btnText, { color: "#F93C65" }]}>Delete</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>;
      })}
        </View>}
      <View style={{
      height: 60
    }} />

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.successCircle, successAnimatedStyle]}>
            <Text style={styles.successIcon}>✓</Text>
          </Animated.View>
          <Animated.Text style={[styles.successText, textAnimatedStyle]}>{successMessage}</Animated.Text>
        </View>
      </Modal>
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
    color: colors.textPrimary,
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
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 4,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 14
  },
  activeTabText: {
    color: colors.textPrimary,
    fontWeight: "800"
  },
  list: {
    gap: 16
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.06)",
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  productName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
    marginRight: 12,
    lineHeight: 24
  },
  price: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12
  },
  mutedText: {
    color: colors.textSecondary,
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
    width: 80,
    height: 80,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border
  },
  badgeGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "transparent"
  },
  badgeSuccess: {
    borderColor: "#16A34A"
  },
  badgeWarning: {
    borderColor: "#D97706"
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  expandedInfo: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700"
  },
  infoValue: {
    color: colors.textPrimary,
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
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSuccess: {
    backgroundColor: "#4CAF50",
  },
  btnWarningBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(245, 124, 0, 0.4)"
  },
  btnDanger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(249, 60, 101, 0.4)"
  },
  btnText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center"
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  successIcon: {
    color: "#FFF",
    fontSize: 40,
    fontWeight: "bold"
  },
  successText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "bold"
  }
});