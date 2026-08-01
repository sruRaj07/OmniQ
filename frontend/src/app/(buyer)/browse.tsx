import { useState, useMemo, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Screen } from "@/components/shared/Screen";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { MenuIcon } from "@/components/ui/MenuIcon";
import { CategorySvgIcon } from "@/components/ui/CategorySvgIcon";
import { useAppTheme } from "@/store/useThemeStore";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/buyer/ProductCard";
import { ProductGridSkeleton } from "@/components/buyer/ProductGridSkeleton";
import type { Product } from "@/types/product.types";

export default function BrowseScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const { products, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useProducts();

  // Dynamically derive categories from products, but explicitly ensure Kitchen is present
  const categories = useMemo(() => {
    const dynamicCats = products.map(p => p.category).filter(Boolean) as string[];
    const allCats = new Set(["Grocery", "Kitchen", ...dynamicCats]);
    return ["All", ...Array.from(allCats)];
  }, [products]);

  const [activeCategory, setActiveCategory] = useState("All");

  const displayProducts = useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  const renderProductItem = useCallback(({ item, index }: { item: Product; index: number }) => (
    <View style={[styles.gridItem, index % 2 === 0 ? styles.padRight : styles.padLeft]}>
      <ProductCard product={item} style={styles.cardFullWidth} />
    </View>
  ), [styles]);

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
                  <CategorySvgIcon category={cat} size={18} />
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
            <View style={{ paddingHorizontal: 16 }}>
              <ProductGridSkeleton count={6} />
            </View>
          ) : (
            <FlashList
              data={displayProducts}
              numColumns={2}
              {...({ estimatedItemSize: 250 } as any)}
              contentContainerStyle={styles.contentScroll}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.headerRow}>
                  <Text style={styles.categoryTitle}>{activeCategory} Products</Text>
                  <Text style={styles.productCount}>{displayProducts.length} items</Text>
                </View>
              }
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
                ) : null
              }
              renderItem={renderProductItem}
              keyExtractor={(item: any) => item.id}
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
  },
  gridItem: {
    flex: 1,
  },
  padRight: {
    paddingRight: 8,
  },
  padLeft: {
    paddingLeft: 8,
  },
  cardFullWidth: {
    width: "100%",
  }
});
