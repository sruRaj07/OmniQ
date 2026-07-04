import { Link, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View, Image, TouchableOpacity, Alert } from "react-native";
import { CartPlusIcon } from "@/components/ui/CartPlusIcon";
import { useCartStore } from "@/store/cartStore";
import { colors } from "@/constants/colors";
import type { Product } from "@/types/product.types";
import { formatCurrency } from "@/utils/formatCurrency";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();

  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
  const isNew = Number(product.price) > 500; // Arbitrary logic for demo
  const discount = product.compare_price ? Math.round((1 - Number(product.price) / Number(product.compare_price)) * 100) : 0;

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable style={styles.link}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            {discount > 0 ? (
              <View style={[styles.tag, styles.tagRed]}>
                <Text style={styles.tagText}>-{discount}%</Text>
              </View>
            ) : isNew ? (
              <View style={[styles.tag, styles.tagBlue]}>
                <Text style={styles.tagText}>New</Text>
              </View>
            ) : (
              <View style={{ width: 40 }} />
            )}
            <TouchableOpacity style={styles.heartBtn}>
              <Text style={styles.heartIcon}>❤</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <Text style={styles.placeholder}>📦</Text>
            )}
          </View>
          
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
            <Text style={styles.sellerSubtitle}>by OmniQ Partner</Text>
            
            <View style={styles.priceRow}>
              <Text style={styles.newPrice}>{formatCurrency(product.price)}</Text>
              {product.compare_price ? (
                <Text style={styles.oldPrice}>{formatCurrency(product.compare_price)}</Text>
              ) : null}
            </View>
            
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>★★★★☆</Text>
              <Text style={styles.reviews}>(189)</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    width: "48%",
    marginBottom: 16
  },
  card: {
    backgroundColor: "#161622",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagRed: {
    backgroundColor: colors.danger,
  },
  tagBlue: {
    backgroundColor: colors.accent,
  },
  tagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900"
  },
  heartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  heartIcon: {
    color: colors.textSecondary,
    fontSize: 12
  },
  imageContainer: {
    height: 140,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    paddingTop: 32,
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  placeholder: {
    fontSize: 50,
    textAlign: "center"
  },
  meta: {
    padding: 16,
    paddingTop: 8
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
    lineHeight: 20
  },
  sellerSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  oldPrice: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  newPrice: {
    color: colors.goldLight,
    fontSize: 18,
    fontWeight: "900"
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  stars: {
    color: colors.goldLight,
    fontSize: 10
  },
  reviews: {
    color: colors.textMuted,
    fontSize: 10
  }
});
