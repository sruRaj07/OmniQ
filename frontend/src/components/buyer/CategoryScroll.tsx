/**
 * OmniQ mobile app - horizontal category selector.
 * Author: OmniQ Team
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

const categories = [
  ["🏠", "All"],
  ["👗", "Fashion"],
  ["📱", "Tech"],
  ["🏡", "Home"],
  ["💄", "Beauty"]
] as const;

export function CategoryScroll() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map(([icon, label], index) => (
        <View key={label} style={[styles.item, index === 0 && styles.active]}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.label, index === 0 && styles.activeText]}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingVertical: 10
  },
  item: {
    width: 88,
    height: 80,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: "rgba(108, 99, 255, 0.14)"
  },
  icon: {
    fontSize: 26
  },
  label: {
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: "800"
  },
  activeText: {
    color: colors.accentLight
  }
});
