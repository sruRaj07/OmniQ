import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/store/useThemeStore";

type MetricCardProps = {
  title: string;
  value: string;
  trend: string;
  trendColor: string;
  icon: React.ReactNode;
  glowColor: string;
};

export const MetricCard = memo(function MetricCard({
  title,
  value,
  trend,
  trendColor,
  icon,
  glowColor
}: MetricCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.iconWrapper}>
        {icon}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.trend, { color: trendColor }]}>{trend}</Text>
    </View>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    width: "47.5%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  iconWrapper: {
    marginBottom: 12,
  },
  title: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6
  },
  value: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4
  },
  trend: {
    fontSize: 11,
    fontWeight: "700"
  }
});