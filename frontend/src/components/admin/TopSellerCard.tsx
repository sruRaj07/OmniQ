import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/colors";
import { formatCurrency } from "@/utils/formatCurrency";
import { StatusBadge } from "@/components/ui/StatusBadge";

type TopSellerCardProps = {
  rank: number;
  name: string;
  orders: number;
  rating?: number;
  gmv?: number;
  status: string;
  timeAgo?: string;
};

export function TopSellerCard({ rank, name, orders, rating, gmv, status, timeAgo }: TopSellerCardProps) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  
  const rankColor = isFirst ? "#6C63FF" : isSecond ? "#FFC107" : isThird ? "#FF9800" : colors.textMuted;

  return (
    <LinearGradient
      colors={["rgba(30, 30, 45, 0.5)", "rgba(15, 15, 26, 0.8)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
        <Text style={styles.rankText}>#{rank}{name.charAt(0)}</Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {orders > 0 ? `${orders} orders` : timeAgo ? `Submitted ${timeAgo}` : "No orders"}
          {rating ? ` · ★ ${rating.toFixed(1)}` : ""}
        </Text>
      </View>
      
      <View style={styles.stats}>
        <Text style={styles.gmv}>{gmv ? formatCurrency(gmv) : "₹—"}</Text>
        <StatusBadge status={status} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rankText: {
    color: "#161622",
    fontSize: 16,
    fontWeight: "900",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  stats: {
    alignItems: "flex-end",
    gap: 6,
  },
  gmv: {
    color: colors.goldLight,
    fontSize: 16,
    fontWeight: "900",
  },
});
