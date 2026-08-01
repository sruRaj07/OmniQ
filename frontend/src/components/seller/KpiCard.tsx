/**
 * OmniQ mobile app - seller KPI card.
 * Author: OmniQ Team
 */
import React, { memo, useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { useThemeColors } from "@/store/useThemeStore";

type KpiCardProps = {
  label: string;
  value: string;
  trend: string;
};

export const KpiCard = memo(function KpiCard({
  label,
  value,
  trend,
}: KpiCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.trend}>{trend}</Text>
    </Card>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    width: "47%",
    padding: 20,
    minHeight: 120
  },
  label: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  value: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: "800",
    marginTop: 8
  },
  trend: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 6
  }
});