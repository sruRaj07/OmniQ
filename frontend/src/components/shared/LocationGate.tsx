/**
 * OmniQ mobile app - serviceable zone indicator.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { colors } from "@/constants/colors";
import { useLocation } from "@/hooks/useLocation";
import { LocationIcon } from "@/components/ui/LocationIcon";

export function LocationGate({ pincode, city }: { pincode?: string, city?: string }) {
  const { isServiceable, isLoading } = useLocation(pincode);

  if (!pincode) {
    return (
      <View style={styles.row}>
        <View style={styles.content}>
          <LocationIcon size={16} color={colors.textPrimary} />
          <Text style={styles.text}>Update pincode to check serviceability</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.row}>
        <View style={styles.content}>
          <LocationIcon size={16} color={colors.textPrimary} />
          <Text style={styles.text}>{city || pincode}</Text>
        </View>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <LocationIcon size={16} color={colors.textPrimary} />
        <Text style={styles.text}>{city || pincode}</Text>
      </View>
      {isServiceable ? (
        <Text style={[styles.accent, { color: colors.success }]}>✓ Serviceable</Text>
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
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
