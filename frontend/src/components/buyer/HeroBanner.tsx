/**
 * OmniQ mobile app - promotional hero banner.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, Image } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";

export function HeroBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.badge60}>
        <Text style={styles.badge60Text}>60%</Text>
        <Text style={styles.badge60TextSmall}>OFF</Text>
      </View>
      <View style={styles.pill}>
        <View style={styles.redDot} />
        <Text style={styles.pillText}>FLASH SALE — TODAY ONLY</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Up to <Text style={styles.gold}>60% off</Text></Text>
          <Text style={styles.title}>top brands</Text>
          <Text style={styles.subtitle}>Limited time offers curated for you</Text>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Shop now →</Text>
          </View>
        </View>
        <Image 
          source={{ uri: "https://cdn3d.iconscout.com/3d/premium/thumb/gift-box-4993510-4161745.png" }} 
          style={styles.giftImage} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#20134E",
    borderRadius: 24,
    padding: 24,
    marginVertical: 20,
    overflow: "hidden",
    position: "relative"
  },
  badge60: {
    position: "absolute",
    top: 16,
    right: 16,
    borderWidth: 1,
    borderColor: colors.goldLight,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center"
  },
  badge60Text: {
    color: colors.goldLight,
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 20
  },
  badge60TextSmall: {
    color: colors.goldLight,
    fontWeight: "800",
    fontSize: 10
  },
  pill: {
    alignSelf: "flex-start",
    borderColor: "rgba(108, 99, 255, 0.4)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(108, 99, 255, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger
  },
  pillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 16
  },
  copy: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  gold: {
    color: colors.goldLight
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "80%"
  },
  button: {
    alignSelf: "flex-start",
    marginTop: 20,
    backgroundColor: colors.accentLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14
  },
  giftImage: {
    width: 100,
    height: 100,
    position: "absolute",
    right: -10,
    bottom: -10
  }
});
