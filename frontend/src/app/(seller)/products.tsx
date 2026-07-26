/**
 * OmniQ mobile app - seller product management.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { ProductForm } from "@/components/seller/ProductForm";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { useSellerProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/utils/formatCurrency";
import { Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { CategorySvgIcon } from "@/components/ui/CategorySvgIcon";
import React, { useState } from "react";

const formatListingDate = (dateString?: string) => {
  if (!dateString) return "Recently listed";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently listed";
    return `Listed: ${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  } catch {
    return "Recently listed";
  }
};

export default function SellerProductsScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const {
    products,
    isLoading
  } = useSellerProducts();
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const getStatusBadge = (product: any) => {
    if (product.is_approved) {
      return (
        <View style={[styles.badge, { borderColor: colors.success }]}>
          <Text style={[styles.badgeText, { color: colors.success }]}>✓ APPROVED</Text>
        </View>
      );
    }
    if (product.is_flagged) {
      return (
        <View style={[styles.badge, { borderColor: colors.danger }]}>
          <Text style={[styles.badgeText, { color: colors.danger }]}>✕ REJECTED</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { borderColor: colors.warning }]}>
        <Text style={[styles.badgeText, { color: colors.warning }]}>⏳ PENDING</Text>
      </View>
    );
  };
  return <>
      <Screen bottomNavItems={[{
      href: "/(seller)/dashboard" as any,
      icon: HomeIcon,
      label: "Home"
    }, {
      href: "/(seller)/products" as any,
      icon: ListIcon,
      label: "Products"
    }, {
      href: "/(seller)/seller-orders" as any,
      icon: BoxIcon,
      label: "Orders"
    }, {
      href: "/(seller)/seller-profile" as any,
      icon: UserIcon,
      label: "Profile"
    }]}>
        <Text style={styles.title}>{editingProduct ? "Edit Product" : "Products"}</Text>
        <ProductForm initialData={editingProduct} onCloseEdit={() => setEditingProduct(null)} />
        <Text style={styles.section}>Live Inventory</Text>
        {isLoading ? <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 20
      }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View> : products.length === 0 ? <Text style={{
        color: colors.textSecondary,
        textAlign: "center",
        paddingVertical: 20
      }}>No products listed yet.</Text> : products.map(product => (
            <TouchableOpacity key={product.id} onPress={() => setEditingProduct(product)} activeOpacity={0.85}>
              <Card style={[styles.product, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {product.images && product.images.length > 0 ? (
                  <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="contain" />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "600" }}>No Image</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{product.title}</Text>
                  <Text style={styles.meta}>{formatListingDate(product.created_at || product.createdAt)}</Text>
                  <View style={styles.badgeWrap}>
                    {(product.category || product.category_id) ? (
                      <View style={[styles.categoryBadge, { borderColor: colors.border }]}>
                        <CategorySvgIcon category={product.category || product.category_id || ""} size={12} showBackground={false} style={{ marginRight: 4 }} />
                        <Text style={[styles.categoryBadgeText, { color: colors.textSecondary }]}>
                          #{String(product.category || product.category_id).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    {getStatusBadge(product)}
                  </View>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>{formatCurrency(product.price)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
      </Screen>
      
    </>;
}
const getStyles = (colors: any) => StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 18
  },
  section: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 28,
    marginBottom: 14
  },
  product: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 12,
    gap: 14,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 2,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 6,
    backgroundColor: "#FAF9F7",
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 5,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.1,
    lineHeight: 21,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  badgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
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
  priceContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingLeft: 4,
  },
  price: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 0.2,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  }
});