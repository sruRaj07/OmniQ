import React from "react";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={[styles.card, idx % 2 === 0 ? styles.leftCard : styles.rightCard]}>
          <View style={styles.imagePlaceholder} />
          <View style={styles.textBarTop} />
          <View style={styles.textBarBottom} />
        </View>
      ))}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    card: {
      width: "48%",
      marginBottom: 16,
      backgroundColor: colors.bgSecondary || "#F3F4F6",
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border || "#E5E7EB",
      overflow: "hidden",
    },
    leftCard: {
      marginRight: "4%",
    },
    rightCard: {},
    imagePlaceholder: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: colors.card2 || "#E5E7EB",
      borderRadius: 12,
      marginBottom: 12,
    },
    textBarTop: {
      width: "80%",
      height: 14,
      backgroundColor: colors.card2 || "#E5E7EB",
      borderRadius: 6,
      marginBottom: 8,
    },
    textBarBottom: {
      width: "50%",
      height: 14,
      backgroundColor: colors.card2 || "#E5E7EB",
      borderRadius: 6,
    },
  });
