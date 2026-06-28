/**
 * OmniQ mobile app - buyer home feed.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { CategoryScroll } from "@/components/buyer/CategoryScroll";
import { HeroBanner } from "@/components/buyer/HeroBanner";
import { ProductCard } from "@/components/buyer/ProductCard";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useProducts } from "@/hooks/useProducts";

export default function BuyerHomeScreen() {
  const { products } = useProducts();
  return (
    <>
      <Screen>
        <Text style={styles.greeting}>Good morning 👋</Text>
        <View style={styles.header}>
          <Text style={styles.logo}>Omni<Text style={styles.logoAccent}>Q</Text></Text>
          <View style={styles.actions}>
            <Text style={styles.action}>🔔</Text>
            <Text style={styles.action}>🛒</Text>
          </View>
        </View>
        <Input placeholder="🔍  Search products, brands..." />
        <HeroBanner />
        <CategoryScroll />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <Text style={styles.link}>See all</Text>
        </View>
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
  greeting: {
    color: colors.textMuted,
    fontWeight: "800"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18
  },
  logo: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900"
  },
  logoAccent: {
    color: colors.accent
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },
  action: {
    width: 52,
    height: 52,
    lineHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.card,
    textAlign: "center",
    fontSize: 24,
    overflow: "hidden"
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: "900"
  },
  link: {
    color: colors.accentLight,
    fontWeight: "900"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  }
});
