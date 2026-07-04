/**
 * OmniQ mobile app - buyer home feed.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { CategoryScroll } from "@/components/buyer/CategoryScroll";
import { AdvertisementCarousel } from "@/components/buyer/AdvertisementCarousel";
import { HeroBanner } from "@/components/buyer/HeroBanner";
import { ProductCard } from "@/components/buyer/ProductCard";
import { AnimatedCartButton } from "@/components/buyer/AnimatedCartButton";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { SearchInput } from "@/components/buyer/SearchInput";
import { ListIcon } from "@/components/ui/ListIcon";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { useProducts } from "@/hooks/useProducts";
import { useRouter } from "expo-router";

export default function BuyerHomeScreen() {
  const { products, isLoading } = useProducts();
  const router = useRouter();

  return (
    <>
      <Screen bottomNavItems={[
          { href: "/(buyer)", icon: HomeIcon, label: "Home" },
          { href: "/(buyer)/cart", icon: ShoppingCartIcon, label: "Cart" },
          { href: "/(buyer)/orders", icon: BoxIcon, label: "Orders" },
          { href: "/(buyer)/profile", icon: UserIcon, label: "Profile" }
        ]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Omni<Text style={styles.logoAccent}>Q</Text></Text>
          </View>
          <AnimatedCartButton onPress={() => router.push("/(buyer)/cart")} />
        </View>
        <SearchInput placeholder="Search Amazon.in" />
        <AdvertisementCarousel />
        <HeroBanner />
        <CategoryScroll />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <Text style={styles.link}>See all</Text>
        </View>
        <View style={styles.grid}>
          {isLoading ? (
            <Text style={{ color: colors.textMuted, marginVertical: 20 }}>Loading products...</Text>
          ) : products.length === 0 ? (
            <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No products found.</Text>
          ) : (
            products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))
          )}
        </View>
      </Screen>
      
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10
  },
  logo: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "900"
  },
  logoAccent: {
    color: colors.accentLight
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  filterText: {
    color: colors.accentLight,
    fontWeight: "700",
    fontSize: 14
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
    justifyContent: "space-between"
  }
});
