/**
 * OmniQ mobile app - seller order card.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { colors } from "@/constants/colors";
import { formatCurrency } from "@/utils/formatCurrency";

type OrderCardProps = {
  order: {
    id: string;
    buyer: string;
    items: string;
    amount: number;
    status: string;
    icon: string;
  };
};

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.icon}>{order.icon}</Text>
      <View style={styles.info}>
        <Text style={styles.id}>{order.id}</Text>
        <Text style={styles.meta}>{order.buyer} · {order.items}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text style={styles.amount}>{formatCurrency(order.amount)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginBottom: 12,
    gap: 16
  },
  icon: {
    width: 54,
    height: 54,
    backgroundColor: colors.card2,
    borderRadius: 14,
    lineHeight: 54,
    textAlign: "center",
    fontSize: 26
  },
  info: {
    flex: 1,
    gap: 6
  },
  id: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  meta: {
    color: colors.textMuted
  },
  amount: {
    color: colors.goldLight,
    fontSize: 20,
    fontWeight: "900"
  }
});
