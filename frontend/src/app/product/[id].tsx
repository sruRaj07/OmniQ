/**
 * OmniQ mobile app - product detail route.
 * Author: OmniQ Team
 */
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, Image, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { apiClient } from "@/lib/apiClient";
import type { Product } from "@/types/product.types";
import { ProductCard } from "@/components/buyer/ProductCard";
export default function ProductDetailScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const {
    id
  } = useLocalSearchParams<{
    id: string;
  }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const { width } = Dimensions.get("window");
  const addItem = useCartStore(state => state.addItem);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveIndex(Math.round(index));
  };
  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      try {
        const response = await apiClient.get(`/products/${id}`);
        if (isMounted && response.data?.data) {
          const p = response.data.data;
          setProduct(p);
          
          try {
            let related: Product[] = [];
            if (p.category) {
              const relatedRes = await apiClient.get(`/products/search?category=${encodeURIComponent(p.category)}&limit=10`);
              if (isMounted && relatedRes.data?.data) {
                 related = relatedRes.data.data.filter((item: Product) => item.id !== p.id);
              }
            }
            
            // Fallback: If no related products found in the same category, fetch generic products
            if (related.length === 0) {
              const fallbackRes = await apiClient.get(`/products?limit=10`);
              if (isMounted && fallbackRes.data?.data) {
                 related = fallbackRes.data.data.filter((item: Product) => item.id !== p.id);
              }
            }

            if (isMounted) {
               setRelatedProducts(related);
            }
          } catch(e) {
            console.error("Failed to fetch related products:", e);
          }
        }
      } catch (error) {
        console.error("Failed to fetch product detail:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);
  if (isLoading) {
    return <Screen>
        <ActivityIndicator size="large" color={colors.accent} style={{
        marginTop: 100
      }} />
      </Screen>;
  }
  if (!product) {
    return <Screen>
        <Text style={{
        color: colors.textPrimary,
        textAlign: "center",
        marginTop: 100
      }}>Product not found</Text>
      </Screen>;
  }
  const discount = product.compare_price ? Math.round((product.compare_price - product.price) / product.compare_price * 100) : 0;
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
  return <Screen>
      <View style={styles.top}>
        <Link href="/(buyer)" style={styles.iconButton}>←</Link>
        <Text style={styles.iconButton}>♥</Text>
      </View>
      <View style={styles.imagePanel}>
        {product.images && product.images.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
          >
            {product.images.map((uri, i) => (
              <View key={i} style={{ width: width, height: "100%", alignItems: "center", justifyContent: "center" }}>
                <Image source={{ uri }} style={styles.productImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.image}>📦</Text>
        )}
      </View>
      <View style={styles.dots}>
        {product.images && product.images.length > 1 ? product.images.map((_, i) => (
          <View key={i} style={i === activeIndex ? styles.dotActive : styles.dot} />
        )) : null}
      </View>

      <Text style={styles.title}>{product.title}</Text>
      <View style={styles.rating}>
        <Text style={styles.meta}>{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}</Text>
      </View>
      {product.description ? (
        <View style={styles.descriptionWrapper}>
          <Text style={styles.description} numberOfLines={isDescExpanded ? undefined : 1}>
            {product.description}
          </Text>
          {product.description.length > 40 && (
            <Text style={styles.readMore} onPress={() => setIsDescExpanded(!isDescExpanded)}>
              {isDescExpanded ? "Read less" : "Read more"}
            </Text>
          )}
        </View>
      ) : null}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        {product.compare_price ? <Text style={styles.compare}>{formatCurrency(product.compare_price)}</Text> : null}
        {discount > 0 ? <Text style={styles.discount}>↓ {discount}% off</Text> : null}
      </View>

      <Link href="/(buyer)/cart" asChild>
        <Button style={styles.button} onPress={() => addItem(product)}>Add to Cart</Button>
      </Link>

      <Link href="/(buyer)/cart" asChild>
        <Button style={styles.buyNowButton} onPress={() => addItem(product)}>Buy Now</Button>
      </Link>

      {relatedProducts.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Customers who viewed this also viewed</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
            {relatedProducts.map(rp => (
              <ProductCard key={rp.id} product={rp} style={styles.relatedCard} />
            ))}
          </ScrollView>
        </View>
      )}
    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.bgTertiary,
    color: colors.textPrimary,
    lineHeight: 52,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    overflow: "hidden"
  },
  imagePanel: {
    height: 360,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -24
  },
  productImage: {
    width: "80%",
    height: "80%"
  },
  image: {
    fontSize: 28
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: 16
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border2
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent
  },
  badges: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 16
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 14
  },
  ratingText: {
    color: colors.textPrimary,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: "hidden",
    fontWeight: "900"
  },
  meta: {
    color: colors.textMuted,
    fontWeight: "700"
  },
  descriptionWrapper: {
    marginTop: 12,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  readMore: {
    color: "#007185",
    fontWeight: "700",
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24
  },
  price: {
    color: colors.goldLight,
    fontSize: 28,
    fontWeight: "900"
  },
  compare: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
    fontSize: 22,
    fontWeight: "800"
  },
  discount: {
    color: colors.success,
    fontSize: 18,
    fontWeight: "900"
  },
  seller: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginTop: 28,
    gap: 14
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 50,
    fontSize: 22,
    fontWeight: "900",
    overflow: "hidden"
  },
  sellerInfo: {
    flex: 1
  },
  sellerName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  },
  sellerMeta: {
    color: colors.success,
    fontWeight: "800"
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 28
  },
  optionTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 26,
    marginBottom: 12
  },
  options: {
    flexDirection: "row",
    gap: 12
  },
  option: {
    color: colors.textSecondary,
    minWidth: 56,
    paddingHorizontal: 18,
    paddingVertical: 12,
    textAlign: "center",
    borderRadius: 14,
    borderColor: colors.border2,
    borderWidth: 1,
    overflow: "hidden",
    fontWeight: "900"
  },
  selectedOption: {
    color: colors.accentLight,
    borderColor: colors.accent
  },
  button: {
    marginTop: 26,
    backgroundColor: "#FFD814",
    borderRadius: 999,
  },
  buyNowButton: {
    marginTop: 12,
    backgroundColor: "#FFA41C",
    borderRadius: 999,
  },
  relatedSection: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
    marginHorizontal: -24,
  },
  relatedTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  relatedScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  relatedCard: {
    width: 150,
    marginBottom: 0,
  }
});