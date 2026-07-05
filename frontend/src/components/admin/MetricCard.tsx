import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/colors";

type MetricCardProps = {
  title: string;
  value: string;
  trend: string;
  trendColor: string;
  icon: React.ReactNode;
  glowColor: string;
};

export function MetricCard({ title, value, trend, trendColor, icon, glowColor }: MetricCardProps) {
  return (
    <LinearGradient
      colors={["rgba(30, 30, 45, 0.7)", "rgba(15, 15, 26, 0.9)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.iconWrapper}>
        <View style={[styles.glow, { backgroundColor: glowColor, shadowColor: glowColor }]} />
        <View style={[styles.iconContainer, { backgroundColor: `${glowColor}15`, borderColor: `${glowColor}30` }]}>
          {icon}
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.trend, { color: trendColor }]}>{trend}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "47.5%",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  iconWrapper: {
    position: "relative",
    marginBottom: 16,
    width: 40,
    height: 40,
  },
  glow: {
    position: "absolute",
    width: 20,
    height: 20,
    top: 10,
    left: 10,
    borderRadius: 10,
    opacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 4,
  },
  trend: {
    fontSize: 12,
    fontWeight: "700",
  },
});
