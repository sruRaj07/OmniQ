/**
 * OmniQ mobile app - compact badge component.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type BadgeProps = {
  label: string;
  tone?: "accent" | "gold" | "success" | "danger" | "neutral";
};

export function Badge({ label, tone = "accent" }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start"
  },
  accent: {
    backgroundColor: "rgba(108, 99, 255, 0.22)",
    borderColor: colors.accent,
    borderWidth: 1
  },
  gold: {
    backgroundColor: "rgba(212, 175, 55, 0.2)"
  },
  success: {
    backgroundColor: "rgba(34, 197, 94, 0.22)"
  },
  danger: {
    backgroundColor: "rgba(255, 77, 109, 0.22)"
  },
  neutral: {
    backgroundColor: colors.card2
  },
  label: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800"
  }
});
