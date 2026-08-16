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
import { getCategoryConfig } from "@/components/ui/CategorySvgIcon";
import { useAppTheme } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
import { useProducts } from "@/hooks/useProducts";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { ProductCard } from "@/components/buyer/ProductCard";
import { ProductGridSkeleton } from "@/components/buyer/ProductGridSkeleton";
import type { Product } from "@/types/product.types";

/** Icon/label colour on a filled chip. Fixed white reads correctly on every category tint. */
const CHIP_ACTIVE_INK = "#FFFFFF";

/** Normalize category to Title Case so "kitchen" and "Kitchen" merge. */
const normalizeCategory = (cat: string) =>
  cat.trim().replace(/\b\w/g, (c) => c.toUpperCase());

export default function BrowseScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  // Pull-to-refresh for this list. `Screen` owns it for scrolling screens; this one
  // passes scroll={false}, so the list attaches it itself.
  const refreshControl = useRefreshControl();

  const { products, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useProducts();

  // Dynamically derive categories from products, but explicitly ensure Kitchen is present
  const categories = useMemo(() => {
    const dynamicCats = products.map(p => p.category).filter(Boolean) as string[];
    const normalized = dynamicCats.map(normalizeCategory);
    const allCats = new Set(["Grocery", "Kitchen", ...normalized]);
    return ["All", ...Array.from(allCats)];
  }, [products]);

  // ⚡ PERFORMANCE: getCategoryConfig walks a chain of substring tests to pick an icon. Resolving
  // it once per category here keeps it off the render path, where it previously ran for every chip
  // on every keystroke-free re-render (tab switch, page fetch, focus change).
  const categoryChips = useMemo(
    () => categories.map(name => ({ name, config: getCategoryConfig(name) })),
    [categories]
  );

  const [activeCategory, setActiveCategory] = useState("All");

  const displayProducts = useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter(p =>
      p.category && normalizeCategory(p.category) === activeCategory
    );
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
        {/* Category filter. A selected chip fills with that category's own tint - the icons already
            carry those colours, so the row stays recognisable at a glance without a second cue. */}
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarContent}
          >
            {categoryChips.map(({ name, config }) => {
              const isActive = activeCategory === name;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${name} category`}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive && { backgroundColor: config.color, borderColor: config.color },
                    pressed && styles.chipPressed,
                  ]}
                  onPress={() => setActiveCategory(name)}
                >
                  {config.renderIcon(16, isActive ? CHIP_ACTIVE_INK : config.color)}
                  <Text
                    style={[styles.chipLabel, isActive && styles.chipLabelActive]}
                    numberOfLines={1}
                  >
                    {name}
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
              refreshControl={refreshControl}
              numColumns={2}
              {...({ estimatedItemSize: 250 } as any)}
              scrollEventThrottle={16}
              contentContainerStyle={styles.contentScroll}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.headerRow}>
                  <Text style={styles.categoryTitle}>
                    {activeCategory === "All" ? "All products" : activeCategory}
                  </Text>
                  <Text style={styles.productCount}>
                    {displayProducts.length} {displayProducts.length === 1 ? "item" : "items"}
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Nothing here yet</Text>
                  <Text style={styles.emptyBody}>
                    No products in {activeCategory} right now. Try another category.
                  </Text>
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
    backgroundColor: colors.bgPrimary,
  },
  filterBar: {
    backgroundColor: colors.bgPrimary,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Opacity only - no layout or shadow work, so the press feedback stays cheap on low-end Android.
  chipPressed: {
    opacity: 0.7,
  },
  chipLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: CHIP_ACTIVE_INK,
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
    alignItems: "baseline",
    marginBottom: 16,
  },
  categoryTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  productCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyState: {
    paddingTop: 48,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
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
