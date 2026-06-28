/**
 * OmniQ mobile app - seller profile.
 * Author: OmniQ Team
 */
import { Link } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";

export default function SellerProfileScreen() {
  return (
    <>
      <Screen>
        <Text style={styles.title}>Seller Profile</Text>
        <Card style={styles.card}>
          <Text style={styles.name}>SportZone India</Text>
          <Text style={styles.meta}>Verified Seller · 4.9 ★ · Bengaluru</Text>
          <Text style={styles.meta}>48 products live · 248 fulfilled orders</Text>
        </Card>
        <Link href="/(buyer)" asChild>
          <Button variant="secondary">Switch to Buyer App</Button>
        </Link>
      </Screen>
      <BottomNavBar
        items={[
          { href: "/(seller)/dashboard", icon: "🏠", label: "Home" },
          { href: "/(seller)/products", icon: "🏷", label: "Products" },
          { href: "/(seller)/orders", icon: "📦", label: "Orders" },
          { href: "/(seller)/profile", icon: "👤", label: "Profile" }
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 18
  },
  card: {
    padding: 22,
    marginBottom: 18,
    gap: 8
  },
  name: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "900"
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 16
  }
});
