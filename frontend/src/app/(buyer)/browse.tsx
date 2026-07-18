import { useState, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
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

// Helper to get a nice image for categories
const getCategoryImage = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('cloth') || cat.includes('shirt') || cat.includes('apparel')) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&q=80';
  if (cat.includes('shoe') || cat.includes('sneaker') || cat.includes('footwear')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80';
  if (cat.includes('hat') || cat.includes('cap')) return 'https://images.unsplash.com/photo-1556306535-0f09a536f01f?w=100&q=80';
  if (cat.includes('bag') || cat.includes('pack') || cat.includes('luggage')) return 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100&q=80';
  if (cat.includes('groc') || cat.includes('food')) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&q=80';
  if (cat.includes('pet')) return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&q=80';
  if (cat.includes('elec') || cat.includes('tech') || cat.includes('device')) return 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&q=80';
  
  // Default image (a nice generic box/package or storefront)
  return 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=100&q=80'; 
};

export default function BrowseScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  
  const { products, isLoading } = useProducts();
  
  // Dynamically derive categories from products
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]));
    return ["All", ...cats];
  }, [products]);

  const [activeCategory, setActiveCategory] = useState("All");

  const displayProducts = useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <Screen
      scroll={false}
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
        {/* Top Horizontal Categories Scroll (Screenshot exact match design) */}
        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryCard,
                    isActive && styles.categoryCardActive,
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  {cat !== "All" && (
                    <Image 
                      source={{ uri: getCategoryImage(cat) }} 
                      style={styles.categoryImage} 
                      contentFit="cover" 
                    />
                  )}
                  <Text
                    style={[
                      styles.categoryText,
                      isActive && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <FlashList
              data={displayProducts}
              numColumns={2}
              estimatedItemSize={250}
              contentContainerStyle={styles.contentScroll}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.headerRow}>
                  <Text style={styles.categoryTitle}>{activeCategory} Products</Text>
                  <Text style={styles.productCount}>{displayProducts.length} items</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <View style={{ flex: 1, paddingRight: index % 2 === 0 ? 8 : 0, paddingLeft: index % 2 === 1 ? 8 : 0 }}>
                  <ProductCard product={item} style={{ width: '100%' }} />
                </View>
              )}
              keyExtractor={(item) => item.id}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#F7F9FC", 
  },
  categoriesContainer: {
    backgroundColor: "#E5E7EB", // Grey background to match screenshot
    paddingVertical: 12,
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8, // Soft rounded corners
    paddingRight: 16,
    paddingLeft: 8,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  categoryCardActive: {
    borderColor: colors.accent,
  },
  categoryImage: {
    width: 32,
    height: 32,
    marginRight: 10,
    borderRadius: 4,
    backgroundColor: "#F3F4F6", // placeholder background if image loads slow
  },
  categoryText: {
    fontSize: 15,
    color: "#111827", // Darker text
    fontWeight: "500",
  },
  categoryTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 100, 
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  productCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  }
});
