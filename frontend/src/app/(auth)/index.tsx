import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/shared/Screen";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { TouchableOpacity } from "react-native-gesture-handler";

export default function OnboardingScreen() {
  const router = useRouter();

  const handleRoleSelect = (role: string) => {
    router.push(`/(auth)/sign-in?role=${role}` as any);
  };

  return (
    <Screen scroll={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to OmniQ</Text>
          <Text style={styles.subtitle}>Choose how you want to use the platform to get started.</Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleRoleSelect("buyer")}>
            <Card style={styles.card}>
              <Text style={styles.cardIcon}>🛍️</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>I'm a Buyer</Text>
                <Text style={styles.cardDesc}>Explore products, add to cart, and shop your favorite items.</Text>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={() => handleRoleSelect("seller")}>
            <Card style={styles.card}>
              <Text style={styles.cardIcon}>🏪</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>I'm a Seller</Text>
                <Text style={styles.cardDesc}>Manage your inventory, process orders, and grow your business.</Text>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={() => handleRoleSelect("admin")}>
            <Card style={styles.card}>
              <Text style={styles.cardIcon}>🛡️</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>I'm an Admin</Text>
                <Text style={styles.cardDesc}>Oversee the platform, manage users, and handle support.</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
    gap: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardIcon: {
    fontSize: 40,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
