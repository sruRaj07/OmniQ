/**
 * OmniQ mobile app - buyer explore screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { ProductCard } from "@/components/buyer/ProductCard";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useProducts } from "@/hooks/useProducts";

export default function ExploreScreen() {
  const { products } = useProducts();
  return (
    <>
      <Screen>
        <Text style={styles.title}>Explore</Text>
        <Input placeholder="Search products, brands, sellers..." />
        <View style={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </View>
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(buyer)", icon: "🏠", label: "Home" },
          { href: "/(buyer)/explore", icon: "🔎", label: "Explore" },
          { href: "/(buyer)/cart", icon: "🛒", label: "Cart" },
          { href: "/(buyer)/orders", icon: "📦", label: "Orders" },
          { href: "/(buyer)/profile", icon: "👤", label: "Profile" }
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 22
  }
});
