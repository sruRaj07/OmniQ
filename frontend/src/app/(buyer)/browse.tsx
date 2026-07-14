import { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Image } from "react-native";
import { Screen } from "@/components/shared/Screen";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { MenuIcon } from "@/components/ui/MenuIcon";
import { useAppTheme } from "@/store/useThemeStore";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/buyer/ProductCard";
import { ActivityIndicator } from "react-native";

const PARENT_CATEGORIES = [
  "Groceries & Pet Suppl...",
];

export default function BrowseScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [activeCategory, setActiveCategory] = useState(PARENT_CATEGORIES[0]);
  
  const { products, isLoading } = useProducts();
  const groceryProducts = products.filter(p => 
    p.category?.toLowerCase().includes("groceries") || 
    p.category?.toLowerCase().includes("grocery")
  );
  const displayProducts = groceryProducts;

  return (
    <Screen
      header={<BuyerHeader />}
      bottomNavItems={[
        { href: "/(buyer)", icon: HomeIcon, label: "Home" },
        { href: "/(buyer)/cart", icon: ShoppingCartIcon, label: "Cart" },
        { href: "/(buyer)/browse", icon: MenuIcon, label: "Browse" },
        { href: "/(buyer)/orders", icon: BoxIcon, label: "Orders" },
        { href: "/(buyer)/profile", icon: UserIcon, label: "Profile" }
      ]}
    >
      <View style={styles.container}>
        {/* Left Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {PARENT_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.sidebarItem,
                  activeCategory === cat && styles.sidebarItemActive,
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text
                  style={[
                    styles.sidebarItemText,
                    activeCategory === cat && styles.sidebarItemTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Right Content */}
        <View style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentScroll}>
            <Text style={styles.categoryTitle}>{activeCategory}</Text>
            
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.grid}>
                {displayProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fff",
  },
  sidebar: {
    flex: 0.32,
    backgroundColor: "#F2F4F8", // Light gray background
    borderRightWidth: 1,
    borderRightColor: "#E0E0E0",
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  sidebarItemActive: {
    backgroundColor: "#fff",
    borderLeftColor: colors.accent,
  },
  sidebarItemText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  sidebarItemTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  content: {
    flex: 0.68,
    backgroundColor: "#fff",
    position: "relative",
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 100, // Space for floating buttons
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  }
});
