/**
 * OmniQ mobile app - the four states every admin data surface must render.
 *
 * The admin console previously destructured `isLoading` and dropped `error` on the floor. Every
 * screen then fell through to `data?.x ?? 0` or an empty list, so a 403 from the gateway looked
 * exactly like a platform with no sellers, no orders and ₹0 GMV. That is the "I open the admin
 * portal and nothing shows" report: the request was failing and the UI had no way to say so.
 *
 * QueryBoundary makes the failure state impossible to skip - a screen renders its content through
 * this, or it does not render at all.
 *
 * Author: OmniQ Team
 */
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";
import { RADIUS, SPACE, withAlpha } from "@/constants/adminTheme";
import { SkeletonRows } from "@/components/seller/SellerUI";
import { AlertIcon, ShieldCheckIcon, SwapIcon } from "@/components/ui/SellerIcons";

export type AdminErrorKind = "permission" | "auth" | "rateLimit" | "offline" | "server" | "unknown";

export type ClassifiedError = {
  kind: AdminErrorKind;
  title: string;
  message: string;
  /** False when retrying cannot possibly help, e.g. the account is not an admin. */
  retryable: boolean;
};

/**
 * Turns an axios failure into something an operator can act on. The distinction that matters most
 * is 403 vs everything else: it means the signed-in account is not an admin as far as the API is
 * concerned, which no amount of refreshing will change.
 */
export function classifyAdminError(error: unknown): ClassifiedError {
  const anyError = error as any;
  const status: number | undefined = anyError?.response?.status;
  const apiMessage: string | undefined =
    anyError?.response?.data?.error?.message ?? anyError?.response?.data?.message;

  if (status === 403) {
    return {
      kind: "permission",
      title: "This account is not an administrator",
      message:
        "You are signed in, but the API does not recognise this account as an admin, so it is " +
        "refusing every request. The admin role has to be set on the account's app_metadata — a " +
        "role stored only in user_metadata is ignored. Sign out and back in after it is fixed.",
      retryable: false
    };
  }

  if (status === 401) {
    return {
      kind: "auth",
      title: "Your session has expired",
      message: "Sign in again to continue managing the platform.",
      retryable: true
    };
  }

  if (status === 429) {
    return {
      kind: "rateLimit",
      title: "Too many requests",
      message: apiMessage ?? "The console is being throttled. Wait a moment and try again.",
      retryable: true
    };
  }

  if (!anyError?.response) {
    return {
      kind: "offline",
      title: "Can't reach OmniQ",
      message: "Check your connection. Nothing has been changed on the platform.",
      retryable: true
    };
  }

  if (status && status >= 500) {
    return {
      kind: "server",
      title: "The server ran into a problem",
      message: apiMessage ?? "This is on our side, not yours. Try again in a moment.",
      retryable: true
    };
  }

  return {
    kind: "unknown",
    title: "Couldn't load this",
    message: apiMessage ?? (anyError?.message as string) ?? "Something went wrong.",
    retryable: true
  };
}

export type AdminErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
  /** Rendered when the failure is a permission problem, e.g. a "back to sign in" action. */
  onSignOut?: () => void;
  compact?: boolean;
};

export const AdminErrorState = memo(function AdminErrorState({
  error,
  onRetry,
  onSignOut,
  compact
}: AdminErrorStateProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const info = useMemo(() => classifyAdminError(error), [error]);

  const tone = info.kind === "permission" || info.kind === "auth" ? colors.danger : colors.warning;
  const Icon = info.kind === "permission" ? ShieldCheckIcon : AlertIcon;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} accessibilityRole="alert">
      <View style={[styles.iconBadge, { backgroundColor: withAlpha(tone, 0.12) }]}>
        <Icon size={compact ? 18 : 24} color={tone} strokeWidth={2} />
      </View>
      <Text style={styles.title}>{info.title}</Text>
      <Text style={styles.message}>{info.message}</Text>

      <View style={styles.actions}>
        {info.retryable && onRetry ? (
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <SwapIcon size={15} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.primaryLabel}>Try again</Text>
          </Pressable>
        ) : null}
        {(info.kind === "permission" || info.kind === "auth") && onSignOut ? (
          <Pressable
            onPress={onSignOut}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          >
            <Text style={styles.ghostLabel}>Sign out</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export type QueryBoundaryProps = {
  isLoading: boolean;
  error: unknown;
  /** True when the query resolved successfully but returned nothing to show. */
  isEmpty?: boolean;
  onRetry?: () => void;
  onSignOut?: () => void;
  /** Skeleton shown while loading. Defaults to generic rows; pass a layout-matched one where it matters. */
  skeleton?: React.ReactNode;
  empty?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * ⚡ PERFORMANCE: this renders exactly one branch — the skeleton, the error, the empty state or the
 * content. It never mounts the content subtree while loading, so a heavy list is not built and
 * thrown away on every refetch.
 */
export function QueryBoundary({
  isLoading,
  error,
  isEmpty,
  onRetry,
  onSignOut,
  skeleton,
  empty,
  children
}: QueryBoundaryProps) {
  // Error wins over loading: a background refetch that is failing must not be hidden behind a
  // skeleton forever.
  if (error) return <AdminErrorState error={error} onRetry={onRetry} onSignOut={onSignOut} />;
  if (isLoading) return <>{skeleton ?? <SkeletonRows count={4} />}</>;
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children}</>;
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      paddingVertical: SPACE.xxxl,
      paddingHorizontal: SPACE.lg,
      gap: SPACE.md
    },
    wrapCompact: { paddingVertical: SPACE.xl },
    iconBadge: {
      width: 52,
      height: 52,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      justifyContent: "center"
    },
    title: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: -0.2
    },
    message: {
      color: colors.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      textAlign: "center",
      maxWidth: 340
    },
    actions: { flexDirection: "row", gap: SPACE.md, marginTop: SPACE.xs },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.sm,
      backgroundColor: colors.accent,
      paddingVertical: 11,
      paddingHorizontal: SPACE.xl,
      borderRadius: RADIUS.pill
    },
    primaryLabel: { color: "#FFFFFF", fontWeight: "800", fontSize: 13.5 },
    ghostBtn: {
      paddingVertical: 11,
      paddingHorizontal: SPACE.xl,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border
    },
    ghostLabel: { color: colors.textSecondary, fontWeight: "700", fontSize: 13.5 },
    pressed: { opacity: 0.82 }
  });
