import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/store/useThemeStore";
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
export function TopSellerCard({
  rank,
  name,
  orders,
  rating,
  gmv,
  status,
  timeAgo
}: TopSellerCardProps) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  return <View style={styles.card}>
      <View style={styles.rankBadge}>
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
    </View>;
}
const getStyles = (colors: any) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  rankText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  info: {
    flex: 1,
    justifyContent: "center"
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  stats: {
    alignItems: "flex-end",
    gap: 6
  },
  gmv: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  }
});