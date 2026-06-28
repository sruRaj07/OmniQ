/**
 * OmniQ mobile app - promotional hero banner.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";

export function HeroBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>⚡ FLASH SALE — TODAY ONLY</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Up to <Text style={styles.gold}>60% Off</Text> Top Brands</Text>
          <Text style={styles.subtitle}>Limited time offers curated for you</Text>
          <Button style={styles.button}>Shop Now →</Button>
        </View>
        <Text style={styles.gift}>🎁</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#2C1B70",
    borderRadius: 28,
    padding: 24,
    marginVertical: 20,
    overflow: "hidden"
  },
  pill: {
    alignSelf: "flex-start",
    borderColor: colors.accentLight,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14
  },
  copy: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  gold: {
    color: colors.goldLight
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 10,
    fontSize: 16
  },
  button: {
    alignSelf: "flex-start",
    marginTop: 22,
    minWidth: 150
  },
  gift: {
    fontSize: 76,
    marginLeft: 10
  }
});
