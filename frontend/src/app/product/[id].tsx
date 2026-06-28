/**
 * OmniQ mobile app - product detail route.
 * Author: OmniQ Team
 */
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { products } from "@/lib/demoData";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = products.find((item) => item.id === id) ?? products[0];
  const addItem = useCartStore((state) => state.addItem);
  const discount = product.comparePrice ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0;
  return (
    <Screen>
      <View style={styles.top}>
        <Link href="/(buyer)" style={styles.iconButton}>←</Link>
        <Text style={styles.iconButton}>♥</Text>
      </View>
      <View style={styles.imagePanel}>
        <Text style={styles.image}>{product.image}</Text>
      </View>
      <View style={styles.dots}>
        <View style={styles.dotActive} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      <View style={styles.badges}>
        <Badge label="Bestseller" />
        <Badge label="Fast Delivery" />
      </View>
      <Text style={styles.title}>{product.title} — Limited Edition</Text>
      <View style={styles.rating}>
        <Text style={styles.ratingText}>★★★★★  {product.rating}</Text>
        <Text style={styles.meta}>{product.reviews} reviews</Text>
        <Text style={styles.meta}>1.2K sold</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        {product.comparePrice ? <Text style={styles.compare}>{formatCurrency(product.comparePrice)}</Text> : null}
        {discount > 0 ? <Text style={styles.discount}>↓ {discount}% off</Text> : null}
      </View>
      <Card style={styles.seller}>
        <Text style={styles.sellerAvatar}>{product.seller.charAt(0)}</Text>
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName}>{product.seller}</Text>
          <Text style={styles.sellerMeta}>✓ Verified Seller · 4.9 ★</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Card>
      <Text style={styles.optionTitle}>Size</Text>
      <View style={styles.options}>
        {["6", "7", "8", "9", "10"].map((size) => (
          <Text key={size} style={[styles.option, size === "7" && styles.selectedOption]}>{size}</Text>
        ))}
      </View>
      <Text style={styles.optionTitle}>Colour</Text>
      <View style={styles.options}>
        {["White", "Black", "Navy"].map((color) => (
          <Text key={color} style={[styles.option, color === "White" && styles.selectedOption]}>{color}</Text>
        ))}
      </View>
      <Link href="/(buyer)/cart" asChild>
        <Button style={styles.button} onPress={() => addItem(product)}>Add to Cart — {formatCurrency(product.price)}</Button>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#2C1B70",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -24
  },
  image: {
    fontSize: 110
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
    fontSize: 27,
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
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24
  },
  price: {
    color: colors.goldLight,
    fontSize: 36,
    fontWeight: "900"
  },
  compare: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
    fontSize: 19,
    fontWeight: "800"
  },
  discount: {
    color: colors.success,
    fontSize: 17,
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
    fontSize: 24,
    fontWeight: "900",
    overflow: "hidden"
  },
  sellerInfo: {
    flex: 1
  },
  sellerName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "900"
  },
  sellerMeta: {
    color: colors.success,
    fontWeight: "800"
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 32
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
    marginTop: 26
  }
});
