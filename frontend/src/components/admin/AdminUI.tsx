/**
 * OmniQ mobile app - shared building blocks for the admin console.
 *
 * The generic primitives (StatusPill, SegmentedTabs, Surface, EmptyState, skeletons, Avatar) already
 * exist in components/seller/SellerUI. They are named for the seller portal but are not specific to
 * it, so they are re-exported here rather than copied - a second set would cost APK size against a
 * 40MB ceiling and buy nothing. Only genuinely admin-shaped components are defined below.
 *
 * Author: OmniQ Team
 */
import React, { memo, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";
import { RADIUS, SHADOW, SPACE, withAlpha } from "@/constants/adminTheme";
import { ChevronRightIcon } from "@/components/ui/SellerIcons";
import { SkeletonBox } from "@/components/seller/SellerUI";

export {
  StatusPill,
  SegmentedTabs,
  SectionHeader,
  EmptyState,
  InfoRow,
  Surface,
  Shimmer,
  SkeletonBox,
  SkeletonRows,
  Avatar,
  IconButton
} from "@/components/seller/SellerUI";
export type { SegmentItem } from "@/components/seller/SellerUI";

export { QueryBoundary, AdminErrorState, classifyAdminError } from "./QueryBoundary";

/* ------------------------------------------------------------------ *
 * Screen title
 * ------------------------------------------------------------------ */

export type AdminHeaderProps = {
  title: string;
  subtitle?: string;
  /** Rendered on the trailing edge - refresh, filters, sign out. */
  actions?: React.ReactNode;
};

export const AdminHeader = memo(function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.headerActions}>{actions}</View> : null}
    </View>
  );
});

/* ------------------------------------------------------------------ *
 * Freshness indicator
 * ------------------------------------------------------------------ */

function relativeLabel(fromMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * "Updated 14s ago", ticking on its own.
 *
 * Numbers on an operations screen are only meaningful alongside their age - an admin looking at
 * ₹4.2L GMV needs to know whether that is current or from before the app was backgrounded. When a
 * refetch is in flight this says so, which also makes a stalled refresh visible.
 *
 * ⚡ PERFORMANCE: one interval, 15s, and only while a timestamp is actually mounted. The tick is
 * state local to this component, so nothing above it re-renders.
 */
export const FreshnessLabel = memo(function FreshnessLabel({
  updatedAt,
  isFetching,
  style
}: {
  updatedAt: number | undefined;
  isFetching?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!updatedAt) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  const label = isFetching ? "Updating…" : updatedAt ? `Updated ${relativeLabel(updatedAt, now)}` : "";
  if (!label) return null;

  return (
    <View style={[styles.freshRow, style]}>
      <View style={[styles.freshDot, { backgroundColor: isFetching ? colors.warning : colors.success }]} />
      <Text style={styles.freshText}>{label}</Text>
    </View>
  );
});

/* ------------------------------------------------------------------ *
 * KPI tiles
 * ------------------------------------------------------------------ */

export type StatTileProps = {
  label: string;
  value: string;
  /** Secondary line: "3 pending", "₹1.2L in 24h". */
  caption?: string;
  captionTone?: "muted" | "positive" | "warning" | "danger";
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  accent?: string;
  onPress?: () => void;
};

/**
 * A single number, its name, and one line of context. Deliberately not a chart: on a 360dp screen
 * an operator reads figures, and a sparkline at that width is decoration that costs render time on
 * the 2GB devices this ships to.
 */
export const StatTile = memo(function StatTile({
  label,
  value,
  caption,
  captionTone = "muted",
  icon: Icon,
  accent,
  onPress
}: StatTileProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const tone = accent ?? colors.accent;

  const captionColor =
    captionTone === "positive"
      ? colors.success
      : captionTone === "warning"
        ? colors.warning
        : captionTone === "danger"
          ? colors.danger
          : colors.textMuted;

  const body = (
    <>
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        {Icon ? (
          <View style={[styles.tileIcon, { backgroundColor: withAlpha(tone, 0.12) }]}>
            <Icon size={13} color={tone} strokeWidth={2.2} />
          </View>
        ) : null}
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {caption ? (
        <Text style={[styles.tileCaption, { color: captionColor }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.tile}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      {body}
    </Pressable>
  );
});

/** Loading placeholder matching StatTile's footprint, so the grid does not jump when data lands. */
export const StatTileSkeleton = memo(function StatTileSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.tile}>
      <SkeletonBox width={64} height={9} radius={4} />
      <SkeletonBox width={96} height={26} radius={6} style={{ marginTop: 14 }} />
      <SkeletonBox width={52} height={9} radius={4} style={{ marginTop: 10 }} />
    </View>
  );
});

/* ------------------------------------------------------------------ *
 * Attention row
 * ------------------------------------------------------------------ */

export type AttentionItemProps = {
  count: number;
  title: string;
  message: string;
  tone?: "warning" | "danger" | "accent";
  actionLabel?: string;
  onPress?: () => void;
};

/**
 * The queue an operator opens the console to clear. Rendered only when the count is non-zero -
 * a permanent "0 pending" banner trains people to stop reading the top of the screen.
 */
export const AttentionCard = memo(function AttentionCard({
  count,
  title,
  message,
  tone = "warning",
  actionLabel = "Review",
  onPress
}: AttentionItemProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  if (!count) return null;

  const color = tone === "danger" ? colors.danger : tone === "accent" ? colors.accent : colors.warning;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.attention,
        { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.07) },
        pressed && styles.tilePressed
      ]}
    >
      <View style={[styles.attentionCount, { backgroundColor: color }]}>
        <Text style={styles.attentionCountText}>{count > 99 ? "99+" : count}</Text>
      </View>
      <View style={styles.attentionBody}>
        <Text style={[styles.attentionTitle, { color }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.attentionMessage} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {onPress ? (
        <View style={styles.attentionAction}>
          <Text style={[styles.attentionActionText, { color }]}>{actionLabel}</Text>
          <ChevronRightIcon size={14} color={color} strokeWidth={2.4} />
        </View>
      ) : null}
    </Pressable>
  );
});

/* ------------------------------------------------------------------ *
 * Distribution bar - a chart that is honest at 360dp
 * ------------------------------------------------------------------ */

export type BreakdownRow = { label: string; value: number; display: string; color?: string };

/**
 * A stacked proportion bar plus a legend. Shares are computed from the same values the legend
 * prints, so the bar and the numbers cannot disagree. Segments below 1.5% are still rendered at a
 * 1.5% minimum width - otherwise a real category becomes an invisible sliver and looks like it was
 * dropped - and the caption says so.
 */
export const BreakdownBar = memo(function BreakdownBar({ rows }: { rows: BreakdownRow[] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const palette = [colors.accent, colors.success, colors.warning, "#0284C7", "#9333EA", colors.danger];

  const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  if (!rows.length || total <= 0) return null;

  const segments = rows.slice(0, 6).map((row, index) => ({
    ...row,
    color: row.color ?? palette[index % palette.length],
    share: (row.value / total) * 100
  }));

  return (
    <View>
      <View style={styles.breakdownTrack}>
        {segments.map((segment) => (
          <View
            key={segment.label}
            style={{
              flexGrow: Math.max(segment.share, 1.5),
              flexBasis: 0,
              backgroundColor: segment.color
            }}
          />
        ))}
      </View>
      <View style={styles.breakdownLegend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {segment.label}
            </Text>
            <Text style={styles.legendValue}>{segment.display}</Text>
            <Text style={styles.legendShare}>{segment.share.toFixed(segment.share < 10 ? 1 : 0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const getStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: SPACE.md,
      marginBottom: SPACE.xl
    },
    headerText: { flex: 1 },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: "900",
      letterSpacing: -0.6
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 3
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },

    freshRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    freshDot: { width: 6, height: 6, borderRadius: 3 },
    freshText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },

    tile: {
      flexGrow: 1,
      flexBasis: "47%",
      minWidth: 140,
      borderRadius: RADIUS.lg,
      padding: SPACE.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW.sm
    },
    tilePressed: { opacity: 0.86 },
    tileTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACE.sm
    },
    tileLabel: {
      flex: 1,
      color: colors.textMuted,
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    tileIcon: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center"
    },
    tileValue: {
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: "900",
      letterSpacing: -0.8,
      marginTop: SPACE.md
    },
    tileCaption: { fontSize: 11.5, fontWeight: "700", marginTop: 5 },

    attention: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      borderWidth: 1,
      borderRadius: RADIUS.lg,
      padding: SPACE.lg
    },
    attentionCount: {
      minWidth: 32,
      height: 32,
      paddingHorizontal: 8,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center"
    },
    attentionCountText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
    attentionBody: { flex: 1 },
    attentionTitle: { fontSize: 13.5, fontWeight: "800" },
    attentionMessage: { color: colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 17 },
    attentionAction: { flexDirection: "row", alignItems: "center", gap: 2 },
    attentionActionText: { fontSize: 12.5, fontWeight: "800" },

    breakdownTrack: {
      flexDirection: "row",
      height: 10,
      borderRadius: RADIUS.pill,
      overflow: "hidden",
      backgroundColor: colors.bgTertiary,
      gap: 2
    },
    breakdownLegend: { marginTop: SPACE.lg, gap: SPACE.md },
    legendRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
    legendSwatch: { width: 9, height: 9, borderRadius: 3 },
    legendLabel: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
    legendValue: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    legendShare: {
      color: colors.textMuted,
      fontSize: 11.5,
      fontWeight: "700",
      minWidth: 40,
      textAlign: "right"
    }
  });
