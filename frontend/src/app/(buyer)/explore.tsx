/**
 * OmniQ mobile app - buyer explore screen.
 * Author: OmniQ Team
 */
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { ProductCard } from "@/components/buyer/ProductCard";
import { ProductGridSkeleton } from "@/components/buyer/ProductGridSkeleton";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { useAppTheme } from "@/store/useThemeStore";
import { useProducts } from "@/hooks/useProducts";
import { useCallback } from "react";
import type { Product } from "@/types/product.types";

export default function ExploreScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  
  const {
    products,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useProducts();

  const renderProductItem = useCallback(({ item, index }: { item: Product; index: number }) => (
    <View style={{ flex: 1, paddingRight: index % 2 === 0 ? 8 : 0, paddingLeft: index % 2 !== 0 ? 8 : 0 }}>
      <ProductCard product={item} style={{ width: '100%' }} />
    </View>
  ), []);

  return <>
      <Screen scroll={false} header={<BuyerHeader />} bottomNavItems={[{
      href: "/(buyer)",
      icon: "🏠",
      label: "Home"
    }, {
      href: "/(buyer)/explore",
      icon: "🔎",
      label: "Explore"
    }, {
      href: "/(buyer)/cart",
      icon: "🛒",
      label: "Cart"
    }, {
      href: "/(buyer)/browse",
      icon: "📋",
      label: "Browse"
    }, {
      href: "/(buyer)/orders",
      icon: "📦",
      label: "Orders"
    }, {
      href: "/(buyer)/profile",
      icon: "👤",
      label: "Profile"
    }]}>
        <View style={{ flex: 1 }}>
          {isLoading ? (
             <View style={{ padding: 16 }}>
               <Text style={styles.title}>Explore</Text>
               <Input placeholder="Search products, brands, sellers..." />
               <View style={{ marginTop: 20 }}>
                 <ProductGridSkeleton count={6} />
               </View>
             </View>
          ) : (
            <FlashList
              data={products}
              numColumns={2}
              {...({ estimatedItemSize: 250 } as any)}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.title}>Explore</Text>
                  <Input placeholder="Search products, brands, sellers..." />
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
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No products found.</Text>
              }
              renderItem={renderProductItem}
              keyExtractor={(item: any) => item.id}
            />
          )}
        </View>
      </Screen>
    </>;
}
const getStyles = (colors: any) => StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 28,
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