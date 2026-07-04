/**
 * OmniQ mobile app - buyer home feed.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { CategoryScroll } from "@/components/buyer/CategoryScroll";
import { HeroBanner } from "@/components/buyer/HeroBanner";
import { ProductCard } from "@/components/buyer/ProductCard";
import { AnimatedCartButton } from "@/components/buyer/AnimatedCartButton";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { SearchIcon } from "@/components/ui/SearchIcon";
import { Input } from "@/components/ui/Input";
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
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Omni<Text style={styles.logoAccent}>Q</Text></Text>
          </View>
          <AnimatedCartButton onPress={() => router.push("/(buyer)/cart")} />
        </View>
        <Input 
          placeholder="Search products, brands..." 
          leftIcon={<SearchIcon size={20} color={colors.textMuted} />} 
          rightIcon={
            <View style={styles.filterBtn}>
              <ListIcon size={14} color={colors.accentLight} />
              <Text style={styles.filterText}>Filter</Text>
            </View>
          }
        />
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
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </View>
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(buyer)", icon: HomeIcon, label: "" },
          { href: "/(buyer)/cart", icon: ShoppingCartIcon, label: "" },
          { href: "/(buyer)/orders", icon: BoxIcon, label: "" },
          { href: "/(buyer)/profile", icon: UserIcon, label: "" }
        ]}
      />
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
    gap: 14
  }
});
