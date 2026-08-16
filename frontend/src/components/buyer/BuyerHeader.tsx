import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SearchInput } from "./SearchInput";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { useThemeColors, useAppTheme } from "@/store/useThemeStore";
import { useRouter } from "expo-router";

export function BuyerHeader() {
  const { colors, mode } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const gradientColors = ['transparent', 'transparent']; 

  return (
    <LinearGradient
      colors={gradientColors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerContainer}
    >
      <View style={styles.searchRow}>
        {/* No fixed placeholder here, so the bar cycles its discovery hints. */}
        <SearchInput style={styles.search} />
        {/* Sits beside the search bar so every buyer feed has an explicit way to pull fresh
            data, for anyone who does not discover the pull-to-refresh gesture. */}
        <RefreshButton size={46} style={styles.refresh} />
      </View>
    </LinearGradient>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    color: '#000',
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  logoAccent: {
    color: '#007185',
  },
  searchRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  search: {
    flex: 1,
  },
  refresh: {
    flexShrink: 0,
  }
});
