/**
 * OmniQ mobile app - reusable card component.
 * Author: OmniQ Team
 */
import React, { useMemo, type PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export const Card = React.memo(function Card({
  children,
  style
}: CardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return <View style={[styles.card, style]}>{children}</View>;
});
const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20
  }
});