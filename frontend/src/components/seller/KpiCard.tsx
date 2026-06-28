/**
 * OmniQ mobile app - seller KPI card.
 * Author: OmniQ Team
 */
import { StyleSheet, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";

type KpiCardProps = {
  label: string;
  value: string;
  trend: string;
  tone?: "gold" | "accent" | "success";
};

export function KpiCard({ label, value, trend, tone = "accent" }: KpiCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, styles[tone]]}>{value}</Text>
      <Text style={styles.trend}>{trend}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    padding: 22,
    minHeight: 128
  },
  label: {
    color: colors.textMuted,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  value: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8
  },
  gold: {
    color: colors.goldLight
  },
  accent: {
    color: colors.accentLight
  },
  success: {
    color: colors.success
  },
  trend: {
    color: colors.success,
    fontWeight: "700",
    marginTop: 4
  }
});
