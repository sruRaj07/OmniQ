/**
 * OmniQ mobile app - reusable pressable button.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
type ButtonProps = PropsWithChildren<Omit<PressableProps, "children" | "style"> & {
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  style?: ViewStyle;
  textStyle?: any;
}>;
export function Button({
  children,
  onPress,
  variant = "primary",
  style,
  textStyle,
  ...pressableProps
}: ButtonProps) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  
  // Resolve label style dynamically based on variant
  const labelStyle = variant === 'primary' ? styles.labelPrimary : 
                     variant === 'secondary' ? styles.labelSecondary :
                     variant === 'danger' ? styles.labelDanger :
                     styles.labelSuccess;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variant === 'primary' && { backgroundColor: colors.accent || "#4F46E5" },
        pressed && styles.pressed,
        style
      ]}
      {...pressableProps}
    >
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
  primary: {
    backgroundColor: colors?.accent || "#4F46E5",
    shadowColor: colors?.accent || "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
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