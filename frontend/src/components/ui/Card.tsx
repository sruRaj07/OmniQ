/**
 * OmniQ mobile app - reusable card component.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";
type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;
export function Card({
  children,
  style
}: CardProps) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <View style={[styles.card, style]}>{children}</View>;
}
const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20
  }
});