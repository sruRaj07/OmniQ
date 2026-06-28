/**
 * OmniQ mobile app - reusable pressable button.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type ButtonProps = PropsWithChildren<Omit<PressableProps, "children" | "style"> & {
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  style?: ViewStyle;
}>;

export function Button({ children, onPress, variant = "primary", style, ...pressableProps }: ButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.base, styles[variant], style]} {...pressableProps}>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primary: {
    backgroundColor: colors.accent
  },
  secondary: {
    backgroundColor: colors.card2,
    borderColor: colors.border2,
    borderWidth: 1
  },
  danger: {
    backgroundColor: "rgba(255, 77, 109, 0.18)",
    borderColor: colors.danger,
    borderWidth: 1
  },
  success: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    borderColor: colors.success,
    borderWidth: 1
  },
  label: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  }
});
