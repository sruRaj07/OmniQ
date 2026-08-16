/**
 * OmniQ mobile app - product detail route.
 * Author: OmniQ Team
 */
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { ArrowLeftIcon } from "@/components/ui/ArrowLeftIcon";
import { SearchInput } from "@/components/buyer/SearchInput";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { apiClient } from "@/lib/apiClient";
import type { Product } from "@/types/product.types";
import { ProductCard } from "@/components/buyer/ProductCard";
import { ImageZoomViewer } from "@/components/shared/ImageZoomViewer";
import { NetworkAwareImage } from "@/components/shared/NetworkAwareImage";
import { FREE_DELIVERY_THRESHOLD } from "@/constants/delivery";

/** At or below this many units left, the stock line switches to an urgency message. */
const LOW_STOCK_THRESHOLD = 5;

/** Gallery height in px. Shared by the frame and each slide so the slides never depend on a
 *  percentage of the ScrollView, which sizes itself to its content and would collapse to 0. */
const GALLERY_HEIGHT = 360;

/** Gallery frame border. onLayout reports the border box, so slides subtract it to match the
 *  scrollable content width exactly - otherwise paging drifts 2px per swipe. */
const GALLERY_BORDER = 1;

/** Mirrors `Screen`: root is capped at 500px and `inner` pads 24px each side. Used to derive a
 *  usable slide width on the very first render, before onLayout has reported one. */
const SCREEN_MAX_WIDTH = 500;
const SCREEN_H_PADDING = 24;

/** Breathing room between the photo and the gallery's rounded corners. */
const SLIDE_PADDING = 16;

export default function ProductDetailScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const router = useRouter();
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
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [activeZoomImage, setActiveZoomImage] = useState("");
  const [measuredGalleryWidth, setMeasuredGalleryWidth] = useState(0);
  const addItem = useCartStore(state => state.addItem);
  const { width: windowWidth } = useWindowDimensions();

  // Slides must never be 0px wide or the gallery renders blank. onLayout is the accurate source,
  // but it only arrives after the first paint (and not at all if the node never resizes), so the
  // computed Screen width seeds it and the measurement takes over once it lands.
  const slideWidth =
    (measuredGalleryWidth || Math.min(windowWidth, SCREEN_MAX_WIDTH) - SCREEN_H_PADDING * 2) -
    GALLERY_BORDER * 2;

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
          } catch (e) {
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
    return (
      <Screen>
        <View style={{ gap: 16, paddingVertical: 16, paddingHorizontal: 4 }}>
          <View style={{ width: "100%", aspectRatio: 1, backgroundColor: colors.card2 || "#E5E7EB", borderRadius: 20 }} />
          <View style={{ width: "75%", height: 26, backgroundColor: colors.card2 || "#E5E7EB", borderRadius: 8, marginTop: 8 }} />
          <View style={{ width: "40%", height: 34, backgroundColor: colors.card2 || "#E5E7EB", borderRadius: 8, marginTop: 4 }} />
          <View style={{ width: "100%", height: 60, backgroundColor: colors.card2 || "#E5E7EB", borderRadius: 12, marginTop: 16 }} />
          <View style={{ width: "100%", height: 50, backgroundColor: colors.accent ? `${colors.accent}44` : "#E5E7EB", borderRadius: 25, marginTop: 12 }} />
        </View>
      </Screen>
    );
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
  const topHeader = (
    <View style={[styles.top, { paddingHorizontal: 24, paddingTop: 18, marginBottom: 12, backgroundColor: colors.bgPrimary }]}>
      <Link href="/(buyer)" asChild>
        <TouchableOpacity style={styles.backButton}>
          <ArrowLeftIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </Link>
      <View style={styles.searchContainer}>
        {/* Fixed placeholder: a hint cycling next to the product being read is a distraction. */}
        <SearchInput placeholder="Search OmniQ" style={styles.headerSearch} />
      </View>
    </View>
  );

  const images = product.images ?? [];
  const savings = product.compare_price ? Math.max(0, product.compare_price - product.price) : 0;
  const stockLeft = product.stock_quantity ?? 0;
  const isOutOfStock = stockLeft <= 0;
  const isLowStock = !isOutOfStock && stockLeft <= LOW_STOCK_THRESHOLD;
  const qualifiesForFreeDelivery = product.price >= FREE_DELIVERY_THRESHOLD;
  // Same cutoff the cart quotes, so the promise made here is the one checkout keeps.
  const deliveryWindow = new Date().getHours() < 12
    ? "Today, 12:00 PM – 7:00 PM"
    : "Tomorrow, 12:00 PM – 7:00 PM";

  return <Screen header={topHeader}>
    {/* Gallery. Slide width tracks the gallery's own box, not the window: the Screen wrapper caps
        its content at 500px, so a window-width slide would break paging on web/tablet. */}
    <View style={styles.gallery} onLayout={event => setMeasuredGalleryWidth(event.nativeEvent.layout.width)}>
      {images.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.galleryScroll}
        >
          {images.map((uri, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.9}
              onPress={() => {
                setActiveZoomImage(uri);
                setIsZoomVisible(true);
              }}
              style={[styles.slide, { width: slideWidth }]}
            >
              {/* Only the first image has a generated thumbnail/placeholder, and it
                  is already in the disk cache from the grid — so slide 0 paints
                  instantly on 2G. Tap opens the full-resolution zoom viewer. */}
              <NetworkAwareImage
                source={uri}
                thumbnailSource={i === 0 ? product.thumbnail_url : null}
                placeholder={i === 0 ? product.blurhash : null}
                style={styles.productImage}
                contentFit="contain"
                priority="high"
                transition={150}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.placeholderGlyph}>📦</Text>
      )}

      {discount > 0 ? (
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>-{discount}%</Text>
        </View>
      ) : null}

      {images.length > 1 ? (
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{activeIndex + 1}/{images.length}</Text>
        </View>
      ) : null}
    </View>

    {images.length > 1 ? (
      <View style={styles.dots}>
        {images.map((_, i) => (
          <View key={i} style={i === activeIndex ? styles.dotActive : styles.dot} />
        ))}
      </View>
    ) : null}

    <ImageZoomViewer
      visible={isZoomVisible}
      imageUrl={activeZoomImage}
      onClose={() => setIsZoomVisible(false)}
    />

    <Text style={styles.title}>{product.title}</Text>

    {/* TEMPORARILY HIDDEN - stock availability row. The derived flags below stay in place so
        this is a one-line restore once the stock source is settled.
        <View style={styles.stockRow}>
          <View style={[styles.stockDot, isOutOfStock ? styles.stockDotOut : isLowStock ? styles.stockDotLow : null]} />
          <Text style={[styles.stockText, isOutOfStock ? styles.stockTextOut : isLowStock ? styles.stockTextLow : null]}>
            {isOutOfStock ? "Out of stock" : isLowStock ? `Only ${stockLeft} left` : "In stock"}
          </Text>
        </View>
    */}

    <Card style={styles.pricingCard}>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        {product.compare_price ? (
          <Text style={styles.compare}>{formatCurrency(product.compare_price)}</Text>
        ) : null}
        {savings > 0 ? (
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>SAVE {formatCurrency(savings)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.taxNote}>Inclusive of all taxes</Text>

      <View style={styles.pricingDivider} />

      <View style={styles.deliveryRow}>
        <View style={styles.deliveryIconWrap}>
          <Text style={styles.deliveryGlyph}>🚚</Text>
        </View>
        <View style={styles.deliveryCopy}>
          <Text style={styles.deliveryTitle}>
            {qualifiesForFreeDelivery
              ? "FREE delivery by OmniQ"
              : `FREE delivery over ${formatCurrency(FREE_DELIVERY_THRESHOLD)}`}
          </Text>
          <Text style={styles.deliverySub}>{deliveryWindow}</Text>
        </View>
      </View>
    </Card>

    <Link href="/(buyer)/cart" asChild>
      <Button style={styles.buyNowButton} onPress={() => addItem(product)}>Buy Now</Button>
    </Link>

    <Link href="/(buyer)/cart" asChild>
      <Button
        variant="secondary"
        style={styles.addToCartButton}
        textStyle={styles.addToCartText}
        onPress={() => addItem(product)}
      >
        Add to Cart
      </Button>
    </Link>

    {product.description ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product details</Text>
        <Text style={styles.description} numberOfLines={isDescExpanded ? undefined : 3}>
          {product.description}
        </Text>
        {product.description.length > 40 && (
          <Text style={styles.readMore} onPress={() => setIsDescExpanded(!isDescExpanded)}>
            {isDescExpanded ? "Read less" : "Read more"}
          </Text>
        )}
      </View>
    ) : null}

    {relatedProducts.length > 0 && (
      <View style={styles.relatedSection}>
        <Text style={styles.relatedTitle}>You may also like</Text>
        <View style={styles.relatedGrid}>
          {relatedProducts.map(rp => (
            <View key={rp.id} style={styles.relatedCardContainer}>
              <ProductCard product={rp} style={{ width: '100%' }} />
            </View>
          ))}
        </View>
      </View>
    )}
  </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSearch: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    boxShadow: "0px 2px 6px rgba(0,0,0,0.1)"
  },
  gallery: {
    height: GALLERY_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: GALLERY_BORDER,
    borderColor: colors.border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  galleryScroll: {
    width: "100%",
    height: GALLERY_HEIGHT
  },
  slide: {
    height: GALLERY_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    padding: SLIDE_PADDING
  },
  productImage: {
    // Both axes are explicit. expo-image renders nothing when it resolves to a zero-sized box,
    // which is what a percentage height collapses to if any ancestor is content-sized.
    width: "100%",
    height: GALLERY_HEIGHT - SLIDE_PADDING * 2
  },
  placeholderGlyph: {
    fontSize: 36
  },
  discountBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  discountBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  counterPill: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(15, 17, 17, 0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 14
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border2
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    lineHeight: 30,
    marginTop: 22
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success
  },
  stockDotLow: {
    backgroundColor: colors.warning
  },
  stockDotOut: {
    backgroundColor: colors.danger
  },
  stockText: {
    ...typography.captionBold,
    color: colors.success
  },
  stockTextLow: {
    color: colors.warning
  },
  stockTextOut: {
    color: colors.danger
  },
  pricingCard: {
    marginTop: 18,
    padding: 18,
    backgroundColor: colors.card2
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 10
  },
  price: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    letterSpacing: -0.5
  },
  compare: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "500",
    textDecorationLine: "line-through"
  },
  saveBadge: {
    // Tinted from the theme token rather than a fixed rgba, so the badge follows a dark palette
    // when one is wired up instead of staying a light-mode green wash.
    backgroundColor: `${colors.success}1F`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  saveBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  taxNote: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4
  },
  pricingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  deliveryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center"
  },
  deliveryGlyph: {
    fontSize: 18
  },
  deliveryCopy: {
    flex: 1
  },
  deliveryTitle: {
    ...typography.captionBold,
    color: colors.textPrimary
  },
  deliverySub: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2
  },
  buyNowButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 999
  },
  addToCartButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 999,
    borderColor: colors.accent,
    backgroundColor: colors.card
  },
  addToCartText: {
    color: colors.accent
  },
  section: {
    marginTop: 30
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: 8
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 23
  },
  readMore: {
    ...typography.captionBold,
    color: colors.accent,
    marginTop: 6
  },
  relatedSection: {
    marginTop: 36,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 24,
    marginHorizontal: -24,
  },
  relatedTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  relatedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  relatedCardContainer: {
    width: "48%",
    marginBottom: 16,
  }
});