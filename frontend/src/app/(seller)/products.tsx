/**
 * OmniQ mobile app - seller product management.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { ProductForm } from "@/components/seller/ProductForm";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useSellerProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/utils/formatCurrency";
import { Image, ActivityIndicator } from "react-native";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";

export default function SellerProductsScreen() {
  const { products, isLoading } = useSellerProducts();

  const getStatusBadge = (product: any) => {
    if (product.is_approved) {
      return <View style={[styles.badge, { backgroundColor: colors.success }]}><Text style={styles.badgeText}>APPROVED</Text></View>;
    }
    if (product.is_flagged) {
      return <View style={[styles.badge, { backgroundColor: colors.danger }]}><Text style={styles.badgeText}>REJECTED</Text></View>;
    }
    return <View style={[styles.badge, { backgroundColor: colors.warning }]}><Text style={styles.badgeText}>PENDING</Text></View>;
  };

  return (
    <>
      <Screen>
        <Text style={styles.title}>Products</Text>
        <ProductForm />
        <Text style={styles.section}>Live Inventory</Text>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : products.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }}>No products listed yet.</Text>
        ) : (
          products.map((product) => (
            <Card key={product.id} style={styles.product}>
              {product.images && product.images.length > 0 ? (
                <Image source={{ uri: product.images[0] }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={{ color: colors.textMuted }}>No img</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{product.title}</Text>
                <Text style={styles.meta}>{product.category} · SKU {product.id.toUpperCase()}</Text>
                {getStatusBadge(product)}
              </View>
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            </Card>
          ))
        )}
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(seller)/dashboard" as any, icon: HomeIcon, label: "" },
          { href: "/(seller)/products" as any, icon: ListIcon, label: "" },
          { href: "/(seller)/seller-orders" as any, icon: BoxIcon, label: "" },
          { href: "/(seller)/seller-profile" as any, icon: UserIcon, label: "" }
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 32,
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
    padding: 16,
    marginBottom: 12,
    gap: 14
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surface
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: 1
  },
  info: {
    flex: 1,
    gap: 4
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 16
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12
  },
  price: {
    color: colors.goldLight,
    fontWeight: "900",
    fontSize: 18
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900"
  }
});
