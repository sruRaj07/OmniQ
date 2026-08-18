/**
 * OmniQ mobile app - shared building blocks for the seller portal.
 *
 * One kit file rather than a dozen 30-line modules: these pieces are always used
 * together, and a single import keeps the screens readable.
 *
 * Author: OmniQ Team
 */
import React, { memo, useCallback, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useThemeColors } from "@/store/useThemeStore";
import { RADIUS, SHADOW, SPACE, withAlpha } from "@/constants/sellerTheme";
import { ChevronRightIcon, type SellerIconProps } from "@/components/ui/SellerIcons";

type IconComponent = React.ComponentType<SellerIconProps>;

/* ------------------------------------------------------------------ */
/* Status pill                                                         */
/* ------------------------------------------------------------------ */

export type StatusPillProps = {
  label: string;
  color: string;
  tint: string;
  icon?: IconComponent;
  /** `sm` is for list rows, `md` for headers and sheets. */
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
};

export const StatusPill = memo(function StatusPill({ label, color, tint, icon: Icon, size = "sm", style }: StatusPillProps) {
  const small = size === "sm";
  return (
    <View
      style={[
        pillStyles.base,
        small ? pillStyles.small : pillStyles.medium,
        { backgroundColor: tint },
        style,
      ]}
    >
      {Icon ? <Icon size={small ? 11 : 13} color={color} strokeWidth={2.6} /> : null}
      <Text style={[small ? pillStyles.labelSmall : pillStyles.labelMedium, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

const pillStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  small: { paddingHorizontal: 8, paddingVertical: 3 },
  medium: { paddingHorizontal: 12, paddingVertical: 6 },
  labelSmall: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  labelMedium: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
});

/* ------------------------------------------------------------------ */
/* Segmented tabs                                                      */
/* ------------------------------------------------------------------ */

export type SegmentItem = { key: string; label: string; count?: number };

type SegmentedTabsProps = {
  items: SegmentItem[];
  value: string;
  onChange: (key: string) => void;
  /** Scrolls horizontally when the labels will not fit; set false for two-up tabs. */
  scrollable?: boolean;
};

export const SegmentedTabs = memo(function SegmentedTabs({ items, value, onChange, scrollable = true }: SegmentedTabsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getTabStyles(colors), [colors]);

  const row = items.map((item) => {
    const active = item.key === value;
    return (
      <Pressable
        key={item.key}
        onPress={() => onChange(item.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.tab,
          !scrollable && styles.tabFlex,
          active && styles.tabActive,
          pressed && !active && styles.tabPressed,
        ]}
      >
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
          {item.label}
        </Text>
        {typeof item.count === "number" && item.count > 0 ? (
          <View style={[styles.badge, active && styles.badgeActive]}>
            <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{item.count > 99 ? "99+" : item.count}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  });

  if (!scrollable) return <View style={styles.staticRow}>{row}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollRow}
      keyboardShouldPersistTaps="handled"
    >
      {row}
    </ScrollView>
  );
});

const getTabStyles = (colors: any) =>
  StyleSheet.create({
    scrollRow: { gap: SPACE.sm, paddingRight: SPACE.xs },
    staticRow: { flexDirection: "row", gap: SPACE.sm },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    tabFlex: { flex: 1, justifyContent: "center" },
    tabActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
    tabPressed: { backgroundColor: colors.bgTertiary },
    tabLabel: { color: colors.textSecondary, fontSize: 13.5, fontWeight: "700" },
    tabLabelActive: { color: colors.bgPrimary },
    badge: {
      minWidth: 20,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.bgTertiary,
      alignItems: "center",
    },
    badgeActive: { backgroundColor: withAlpha(colors.bgPrimary, 0.25) },
    badgeText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
    badgeTextActive: { color: colors.bgPrimary },
  });

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

type SectionHeaderProps = {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const SectionHeader = memo(function SectionHeader({ title, caption, actionLabel, onAction, style }: SectionHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getSectionStyles(colors), [colors]);
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <ChevronRightIcon size={14} color={colors.accent} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
});

const getSectionStyles = (colors: any) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.md },
    textWrap: { flex: 1 },
    title: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
    caption: { color: colors.textMuted, fontSize: 12.5, fontWeight: "500", marginTop: 2 },
    action: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingLeft: 8 },
    actionPressed: { opacity: 0.6 },
    actionLabel: { color: colors.accent, fontSize: 13.5, fontWeight: "700" },
  });

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

type EmptyStateProps = {
  icon: IconComponent;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export const EmptyState = memo(function EmptyState({ icon: Icon, title, message, actionLabel, onAction, compact }: EmptyStateProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getEmptyStyles(colors), [colors]);
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.iconCircle}>
        <Icon size={26} color={colors.textMuted} strokeWidth={1.8} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const getEmptyStyles = (colors: any) =>
  StyleSheet.create({
    wrap: { alignItems: "center", paddingVertical: SPACE.xxxl, paddingHorizontal: SPACE.xl },
    wrapCompact: { paddingVertical: SPACE.xl },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.bgTertiary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACE.lg,
    },
    title: { color: colors.textPrimary, fontSize: 16.5, fontWeight: "800", textAlign: "center" },
    message: {
      color: colors.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 6,
      maxWidth: 300,
    },
    cta: {
      marginTop: SPACE.lg,
      paddingHorizontal: SPACE.xl,
      paddingVertical: 11,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.accent,
      ...SHADOW.sm,
    },
    ctaPressed: { opacity: 0.85 },
    ctaLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  });

/* ------------------------------------------------------------------ */
/* Info row (label / value pairs in the profile screen)                */
/* ------------------------------------------------------------------ */

type InfoRowProps = {
  icon: IconComponent;
  label: string;
  value?: string | null;
  fallback?: string;
  action?: React.ReactNode;
  multiline?: boolean;
};

export const InfoRow = memo(function InfoRow({ icon: Icon, label, value, fallback = "Not provided", action, multiline }: InfoRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getInfoStyles(colors), [colors]);
  const filled = Boolean(value && String(value).trim());
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Icon size={16} color={colors.textSecondary} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !filled && styles.valueEmpty]} numberOfLines={multiline ? undefined : 2}>
          {filled ? value : fallback}
        </Text>
      </View>
      {action}
    </View>
  );
});

const getInfoStyles = (colors: any) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md, paddingVertical: SPACE.md },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.md,
      backgroundColor: colors.bgTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    body: { flex: 1, paddingTop: 1 },
    label: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    value: { color: colors.textPrimary, fontSize: 14.5, fontWeight: "600", lineHeight: 21, marginTop: 3 },
    valueEmpty: { color: colors.textMuted, fontWeight: "500" },
  });

/* ------------------------------------------------------------------ */
/* Surface: the one card look used across the portal                   */
/* ------------------------------------------------------------------ */

type SurfaceProps = React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** `md` lifts the card off the page; used for cards that hold a primary number. */
  elevation?: "none" | "sm" | "md";
  onPress?: () => void;
}>;

export const Surface = memo(function Surface({ children, style, elevation = "sm", onPress }: SurfaceProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getSurfaceStyles(colors), [colors]);
  const base = [styles.surface, SHADOW[elevation], style];

  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
});

const getSurfaceStyles = (colors: any) =>
  StyleSheet.create({
    surface: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // A flat opacity dip reads as a press without triggering a layout pass.
    pressed: { opacity: 0.9 },
  });

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

/**
 * ⚡ PERFORMANCE: one shared value drives the whole skeleton group, so a loading
 * screen animates a single node on the UI thread instead of one timer per bar.
 * Wrap a block of `SkeletonBox`es in a single `Shimmer`.
 */
export function Shimmer({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const progress = useSharedValue(0.5);

  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.45 + progress.value * 0.4 }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export const SkeletonBox = memo(function SkeletonBox({
  width,
  height,
  radius = RADIUS.sm,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: colors.bgTertiary }, style]} />;
});

/** Placeholder for a media + two-line-text list row (orders, products). */
export const SkeletonRows = memo(function SkeletonRows({ count = 4 }: { count?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => getSkeletonStyles(colors), [colors]);
  const rows = useMemo(() => Array.from({ length: count }, (_, index) => index), [count]);

  return (
    <Shimmer>
      {rows.map((index) => (
        <View key={index} style={styles.row}>
          <SkeletonBox width={64} height={64} radius={RADIUS.md} />
          <View style={styles.rowBody}>
            <SkeletonBox width="70%" height={13} />
            <SkeletonBox width="45%" height={11} style={styles.gap} />
            <SkeletonBox width={72} height={16} radius={RADIUS.pill} style={styles.gap} />
          </View>
          <SkeletonBox width={54} height={16} />
        </View>
      ))}
    </Shimmer>
  );
});

const getSkeletonStyles = (colors: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      padding: SPACE.md,
      marginBottom: SPACE.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    rowBody: { flex: 1 },
    gap: { marginTop: 8 },
  });

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

export const Avatar = memo(function Avatar({ name, size = 48 }: { name?: string | null; size?: number }) {
  const colors = useThemeColors();
  const initial = (name || "O").trim().charAt(0).toUpperCase() || "O";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.lg,
        backgroundColor: withAlpha(colors.accent, 0.12),
        borderWidth: 1,
        borderColor: withAlpha(colors.accent, 0.25),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.accent, fontSize: size * 0.42, fontWeight: "800" }}>{initial}</Text>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Icon button                                                         */
/* ------------------------------------------------------------------ */

export const IconButton = memo(function IconButton({
  icon: Icon,
  onPress,
  label,
  size = 40,
  tone = "neutral",
}: {
  icon: IconComponent;
  onPress: () => void;
  /** Accessibility label; the button itself is icon-only. */
  label: string;
  size?: number;
  tone?: "neutral" | "accent";
}) {
  const colors = useThemeColors();
  const accent = tone === "accent";
  const handlePress = useCallback(() => onPress(), [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: RADIUS.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: accent ? withAlpha(colors.accent, 0.1) : colors.card,
          borderWidth: 1,
          borderColor: accent ? withAlpha(colors.accent, 0.25) : colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon size={size * 0.45} color={accent ? colors.accent : colors.textSecondary} strokeWidth={2.2} />
    </Pressable>
  );
});
