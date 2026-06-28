/**
 * OmniQ mobile app - buyer product card.
 * Author: OmniQ Team
 */
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import type { Product } from "@/types/product.types";
import { formatCurrency } from "@/utils/formatCurrency";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable style={styles.link}>
        <Card style={styles.card}>
          <View style={styles.topRow}>
            {product.badge ? <Badge label={product.badge} tone={product.badge.includes("-") ? "danger" : "accent"} /> : <View />}
            <Text style={styles.heart}>♥</Text>
          </View>
          <Text style={styles.image}>{product.image}</Text>
          <View style={styles.meta}>
            <Text style={styles.title}>{product.title}</Text>
            <Text style={styles.seller}>by {product.seller}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
              {product.comparePrice ? <Text style={styles.compare}>{formatCurrency(product.comparePrice)}</Text> : null}
            </View>
            <Text style={styles.rating}>★★★★★ <Text style={styles.seller}>({product.reviews})</Text></Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    width: "48%"
  },
  card: {
    overflow: "hidden",
    minHeight: 346
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    alignItems: "center"
  },
  heart: {
    color: colors.textPrimary,
    fontSize: 24,
    backgroundColor: colors.bgSecondary,
    width: 38,
    height: 38,
    borderRadius: 19,
    textAlign: "center",
    lineHeight: 38
  },
  image: {
    fontSize: 66,
    textAlign: "center",
    paddingVertical: 20
  },
  meta: {
    backgroundColor: colors.card2,
    padding: 16,
    marginTop: "auto"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22
  },
  seller: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 5
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8
  },
  price: {
    color: colors.goldLight,
    fontWeight: "900",
    fontSize: 20
  },
  compare: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
    fontWeight: "700"
  },
  rating: {
    color: colors.goldLight,
    marginTop: 8,
    fontSize: 13
  }
});
