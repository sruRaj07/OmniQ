/**
 * OmniQ mobile app - buyer home feed.
 * Author: OmniQ Team
 */
import { lazy, Suspense, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { CategoryScroll } from "@/components/buyer/CategoryScroll";
import { HeroBanner } from "@/components/buyer/HeroBanner";
import { ProductCard } from "@/components/buyer/ProductCard";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { MenuIcon } from "@/components/ui/MenuIcon";
import { SearchInput } from "@/components/buyer/SearchInput";
import { ListIcon } from "@/components/ui/ListIcon";
import { Screen } from "@/components/shared/Screen";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { useAppTheme } from "@/store/useThemeStore";
import { useProducts } from "@/hooks/useProducts";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import type { Product } from "@/types/product.types";

// ⚡ LAZY-LOAD: Defer heavy below-the-fold components to accelerate first paint
const AdvertisementCarousel = lazy(() => import("@/components/buyer/AdvertisementCarousel").then(m => ({ default: m.AdvertisementCarousel })));

export default function BuyerHomeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const {
    products,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useProducts();
  const router = useRouter();

  const renderProductItem = useCallback(({ item, index }: { item: Product; index: number }) => (
    <View style={{ flex: 1, paddingRight: index % 2 === 0 ? 8 : 0, paddingLeft: index % 2 !== 0 ? 8 : 0 }}>
      <ProductCard product={item} style={{ width: '100%' }} />
    </View>
  ), []);

  return <>
      <Screen scroll={false} header={<BuyerHeader />} bottomNavItems={[{
          href: "/(buyer)",
          icon: HomeIcon,
          label: "Home"
        }, {
          href: "/(buyer)/cart",
          icon: ShoppingCartIcon,
          label: "Cart"
        }, {
          href: "/(buyer)/browse",
          icon: MenuIcon,
          label: "Browse"
        }, {
          href: "/(buyer)/orders",
          icon: BoxIcon,
          label: "Orders"
        }, {
          href: "/(buyer)/profile",
          icon: UserIcon,
          label: "Profile"
        }]}>
        <View style={{ flex: 1 }}>
          <FlashList
            data={products}
            numColumns={2}
            {...({ estimatedItemSize: 250 } as any)}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <Suspense fallback={<View style={{ height: 180 }} />}>
                  <AdvertisementCarousel type="ads" />
                </Suspense>
                <HeroBanner />
                <Suspense fallback={<View style={{ height: 180 }} />}>
                  <AdvertisementCarousel type="offers" />
                </Suspense>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Trending Now</Text>
                  <Text style={styles.link}>See all</Text>
                </View>
                {isLoading && (
                  <Text style={{ color: colors.textMuted, marginVertical: 20 }}>Loading products...</Text>
                )}
                {!isLoading && products.length === 0 && (
                  <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No products found.</Text>
                )}
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
        </View>
      </Screen>
    </>;
}
const getStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10
  },
  logo: {
    color: colors.textPrimary,
    fontSize: 28,
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
    fontSize: 13
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 20,
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700"
  },
  link: {
    color: "#007185",
    fontWeight: "600",
    fontSize: 13
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  }
});