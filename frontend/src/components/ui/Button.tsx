/**
 * OmniQ mobile app - reusable pressable button.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle, type StyleProp } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
type ButtonProps = PropsWithChildren<Omit<PressableProps, "children" | "style"> & {
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  style?: StyleProp<ViewStyle>;
  textStyle?: any;
  /** Shows a spinner and blocks presses. Prevents duplicate submits on a slow connection. */
  loading?: boolean;
  /** Rendered before the label, e.g. a provider logo. */
  icon?: React.ReactNode;
}>;
export function Button({
  children,
  onPress,
  variant = "primary",
  style,
  textStyle,
  loading = false,
  icon,
  disabled,
  ...pressableProps
}: ButtonProps) {
  const colors = useThemeColors();
  const styles = getStyles(colors);

  // Resolve label style dynamically based on variant
  const labelStyle = variant === 'primary' ? styles.labelPrimary :
                     variant === 'secondary' ? styles.labelSecondary :
                     variant === 'danger' ? styles.labelDanger :
                     styles.labelSuccess;

  const isBlocked = loading || disabled;
  const spinnerColor = variant === 'primary' ? "#FFFFFF" : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: Boolean(isBlocked) }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variant === 'primary' && { backgroundColor: colors.accent || "#4F46E5" },
        pressed && styles.pressed,
        isBlocked && styles.blocked,
        style
      ]}
      {...pressableProps}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} style={styles.spinner} /> : null}
      {!loading && icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, labelStyle, textStyle]}>{children}</Text>
    </Pressable>
  );
}
const getStyles = (colors: any) => StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    flexDirection: "row",
  },
  pressed: {
    opacity: 0.85
  },
  blocked: {
    opacity: 0.6
  },
  spinner: {
    marginRight: 10
  },
  icon: {
    marginRight: 10
  },
  primary: {
    backgroundColor: colors?.accent || "#4F46E5",
    boxShadow: `0px 2px 3px ${colors?.accent || "#4F46E5"}33` as any
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1
  },
  danger: {
    backgroundColor: "rgba(255, 77, 109, 0.1)",
    borderColor: colors.danger,
    borderWidth: 1
  },
  success: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: colors.success,
    borderWidth: 1
  },
  label: {
    ...typography.button,
    letterSpacing: 0.3
  },
  labelPrimary: {
    color: "#FFFFFF"
  },
  labelSecondary: {
    color: colors.textPrimary
  },
  labelDanger: {
    color: colors.danger
  },
  labelSuccess: {
    color: colors.success
  }
});