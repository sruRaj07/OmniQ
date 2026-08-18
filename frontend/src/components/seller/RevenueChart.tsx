/**
 * OmniQ mobile app - seller weekly revenue chart.
 *
 * Tapping a bar moves the readout in the header rather than opening a tooltip, so the
 * number is always in the same place and never sits under the seller's thumb.
 *
 * Author: OmniQ Team
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { useThemeColors } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { RADIUS, SHADOW, SPACE, withAlpha } from "@/constants/sellerTheme";

const PLOT_HEIGHT = 116;
/** Empty days still draw a sliver so the axis reads as seven days, not four. */
const MIN_BAR_HEIGHT = 4;

type RevenueChartProps = {
  /** One total per day, oldest first. */
  data: number[];
  /** Same length as `data`; drives the axis labels and the header date. */
  days: Date[];
};

type BarProps = {
  index: number;
  height: number;
  selected: boolean;
  label: string;
  isToday: boolean;
  progress: SharedValue<number>;
  onSelect: (index: number) => void;
  colors: any;
};

const Bar = memo(function Bar({ index, height, selected, label, isToday, progress, onSelect, colors }: BarProps) {
  // ⚡ PERFORMANCE: the grow-in runs from one shared value on the UI thread. Each bar only
  // reads it — no per-bar timer, and no JS frame work while the chart animates.
  const animatedStyle = useAnimatedStyle(() => ({ height: Math.max(height * progress.value, MIN_BAR_HEIGHT) }));

  const handlePress = useCallback(() => onSelect(index), [index, onSelect]);

  return (
    <Pressable onPress={handlePress} style={barStyles.column} hitSlop={4} accessibilityRole="button" accessibilityLabel={label}>
      <View style={barStyles.track}>
        <Animated.View style={[barStyles.bar, animatedStyle, selected && barStyles.barSelected]}>
          <LinearGradient
            colors={
              selected
                ? [colors.accentLight, colors.accent]
                : [withAlpha(colors.accent, 0.35), withAlpha(colors.accent, 0.18)]
            }
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text
        style={[
          barStyles.label,
          { color: selected ? colors.textPrimary : colors.textMuted },
          isToday && barStyles.labelToday,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const barStyles = StyleSheet.create({
  column: { flex: 1, alignItems: "center", gap: SPACE.sm },
  track: { height: PLOT_HEIGHT, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: {
    width: "72%",
    maxWidth: 26,
    borderRadius: RADIUS.xs,
    overflow: "hidden",
  },
  barSelected: { width: "82%" },
  label: { fontSize: 11, fontWeight: "700" },
  labelToday: { textDecorationLine: "underline" },
});

export const RevenueChart = memo(function RevenueChart({ data, days }: RevenueChartProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [selected, setSelected] = useState(data.length - 1);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [progress, data.length]);

  const { total, max, average, heights } = useMemo(() => {
    const sum = data.reduce((acc, value) => acc + value, 0);
    const peak = Math.max(...data, 1);
    return {
      total: sum,
      max: peak,
      average: data.length ? sum / data.length : 0,
      heights: data.map((value) => (value / peak) * PLOT_HEIGHT),
    };
  }, [data]);

  const labels = useMemo(
    () => days.map((day) => day.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 1)),
    [days]
  );

  const todayIndex = days.length - 1;
  const safeIndex = Math.min(Math.max(selected, 0), Math.max(data.length - 1, 0));
  const selectedValue = data[safeIndex] ?? 0;
  const selectedDay = days[safeIndex];
  const isSelectionToday = safeIndex === todayIndex;

  const handleSelect = useCallback((index: number) => setSelected(index), []);

  const hasRevenue = total > 0;
  // The average line only helps once there is something to compare against.
  const averageOffset = hasRevenue ? (average / max) * PLOT_HEIGHT : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.caption}>
            {isSelectionToday ? "Today" : selectedDay?.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </Text>
          <Text style={styles.value}>{formatCurrency(selectedValue)}</Text>
        </View>
        <View style={styles.periodChip}>
          <Text style={styles.periodLabel}>7 DAYS</Text>
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Week total</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>

      <View style={styles.plot}>
        {/* +24 lifts the average line clear of the day labels that sit under the plot area. */}
        {hasRevenue ? (
          <View style={[styles.averageLine, { bottom: averageOffset + 24 }]} pointerEvents="none">
            <Text style={styles.averageLabel}>avg</Text>
          </View>
        ) : null}

        <View style={styles.bars}>
          {heights.map((height, index) => (
            <Bar
              key={index}
              index={index}
              height={height}
              selected={index === safeIndex}
              isToday={index === todayIndex}
              label={labels[index]}
              progress={progress}
              onSelect={handleSelect}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {!hasRevenue ? <Text style={styles.emptyNote}>No sales in the last 7 days yet.</Text> : null}
    </View>
  );
});

const getStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACE.xl,
      ...SHADOW.sm,
    },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    headerText: { flex: 1 },
    caption: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
    value: { color: colors.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: -0.6, marginTop: 4 },
    periodChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.bgTertiary,
    },
    periodLabel: { color: colors.textSecondary, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6 },
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: SPACE.md,
      paddingTop: SPACE.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: { color: colors.textSecondary, fontSize: 12.5, fontWeight: "600" },
    totalValue: { color: colors.textPrimary, fontSize: 14.5, fontWeight: "800" },
    plot: { marginTop: SPACE.lg },
    bars: { flexDirection: "row", alignItems: "flex-end", gap: SPACE.sm },
    averageLine: {
      position: "absolute",
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderTopColor: colors.border2,
      borderStyle: "dashed",
      alignItems: "flex-end",
    },
    averageLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "700", marginTop: -12 },
    emptyNote: { color: colors.textMuted, fontSize: 12.5, textAlign: "center", marginTop: SPACE.md },
  });
