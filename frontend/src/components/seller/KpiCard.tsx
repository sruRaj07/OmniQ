/**
 * OmniQ mobile app - seller KPI card.
 *
 * One metric per card: an icon to find it by shape, the number at the largest size on the
 * screen, and a delta that is colour-coded so "up" and "down" read before the words do.
 *
 * Author: OmniQ Team
 */
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";
import { RADIUS, SHADOW, SPACE, withAlpha } from "@/constants/sellerTheme";
import { TrendDownIcon, TrendFlatIcon, TrendUpIcon, type SellerIconProps } from "@/components/ui/SellerIcons";

export type KpiTrend = "up" | "down" | "flat";

type KpiCardProps = {
  label: string;
  value: string;
  /** Short delta sentence, e.g. "12% vs yesterday". Omit the arrow — the icon carries it. */
  trend?: string;
  direction?: KpiTrend;
  icon: React.ComponentType<SellerIconProps>;
  /** Accent used for the icon chip. Defaults to the brand accent. */
  tone?: string;
  onPress?: () => void;
};

export const KpiCard = memo(function KpiCard({
  label,
  value,
  trend,
  direction = "flat",
  icon: Icon,
  tone,
  onPress,
}: KpiCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const accent = tone || colors.accent;
  const trendColor =
    direction === "up" ? colors.success : direction === "down" ? colors.danger : colors.textMuted;
  const TrendIcon = direction === "up" ? TrendUpIcon : direction === "down" ? TrendDownIcon : TrendFlatIcon;

  const body = (
    <>
      <View style={styles.top}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Icon size={16} color={accent} strokeWidth={2.2} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>

      {trend ? (
        <View style={styles.trendRow}>
          <TrendIcon size={12} color={trendColor} strokeWidth={2.6} />
          <Text style={[styles.trend, { color: trendColor }]} numberOfLines={1}>
            {trend}
          </Text>
        </View>
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.card}>{body}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
});

const getStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 118,
      padding: SPACE.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "space-between",
      ...SHADOW.sm,
    },
    pressed: { opacity: 0.9 },
    top: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
    iconChip: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    value: {
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.6,
      marginTop: SPACE.md,
    },
    trendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
    trend: { flex: 1, fontSize: 11.5, fontWeight: "600" },
  });
