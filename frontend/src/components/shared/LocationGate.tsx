/**
 * OmniQ mobile app - serviceable zone indicator.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { colors } from "@/constants/colors";
import { useLocation } from "@/hooks/useLocation";

export function LocationGate({ pincode, city }: { pincode?: string, city?: string }) {
  const { isServiceable, zoneName, isLoading } = useLocation(pincode);

  if (!pincode) {
    return (
      <View style={styles.row}>
        <Text style={styles.text}>📍 Update pincode to check serviceability</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.row}>
        <Text style={styles.text}>📍 {city || pincode}</Text>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.text}>📍 {city || pincode}</Text>
      {isServiceable ? (
        <Text style={[styles.accent, { color: colors.success }]}>✓ Serviceable in {zoneName}</Text>
      ) : (
        <Text style={[styles.accent, { color: colors.danger }]}>✕ Not serviceable</Text>
      )}
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
