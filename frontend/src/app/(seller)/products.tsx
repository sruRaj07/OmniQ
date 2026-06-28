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
import { useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/utils/formatCurrency";

export default function SellerProductsScreen() {
  const { products } = useProducts();
  return (
    <>
      <Screen>
        <Text style={styles.title}>Products</Text>
        <ProductForm />
        <Text style={styles.section}>Live Inventory</Text>
        {products.map((product) => (
          <Card key={product.id} style={styles.product}>
            <Text style={styles.image}>{product.image}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{product.title}</Text>
              <Text style={styles.meta}>{product.category} · SKU {product.id.toUpperCase()}</Text>
            </View>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          </Card>
        ))}
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(seller)/dashboard", icon: "🏠", label: "Home" },
          { href: "/(seller)/products", icon: "🏷", label: "Products" },
          { href: "/(seller)/orders", icon: "📦", label: "Orders" },
          { href: "/(seller)/profile", icon: "👤", label: "Profile" }
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
    fontSize: 34
  },
  info: {
    flex: 1
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 16
  },
  meta: {
    color: colors.textMuted,
    marginTop: 4
  },
  price: {
    color: colors.goldLight,
    fontWeight: "900",
    fontSize: 18
  }
});
