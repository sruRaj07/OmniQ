/**
 * OmniQ mobile app - search input bar (tappable on home, navigates to search screen).
 * Author: OmniQ Team
 */
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { SearchIcon } from "@/components/ui/SearchIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { useAppTheme } from "@/store/useThemeStore";

export interface SearchInputProps {
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchInput({ placeholder = "Search OmniQ", style }: SearchInputProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      activeOpacity={0.8}
      onPress={() => router.push("/(buyer)/search")}
    >
      <View style={styles.iconContainer}>
        <SearchIcon size={22} color={colors.textPrimary} />
      </View>
      <Text style={styles.placeholderText}>{placeholder}</Text>
      <View style={styles.filterBtn}>
        <ListIcon size={16} color={colors.textPrimary} />
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 10,
  },
  placeholderText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "500",
  },
  filterBtn: {
    padding: 6,
    marginLeft: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 6,
  }
});
