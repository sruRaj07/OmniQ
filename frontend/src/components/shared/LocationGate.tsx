/**
 * OmniQ mobile app - serviceable zone indicator.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { useLocation } from "@/hooks/useLocation";

export function LocationGate() {
  const location = useLocation();
  return (
    <View style={styles.row}>
      <Text style={styles.text}>📍 {location.city}</Text>
      <Text style={styles.accent}>{location.radiusKm} km serviceable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginVertical: 14
  },
  text: {
    color: colors.textPrimary,
    fontWeight: "800"
  },
  accent: {
    color: colors.accentLight,
    fontWeight: "800"
  }
});
