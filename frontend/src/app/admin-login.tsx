/**
 * OmniQ mobile app - admin login preview screen.
 * Author: OmniQ Team
 */
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";

export default function AdminLoginScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.shield}><Text style={styles.shieldText}>🛡</Text></View>
        <Text style={styles.title}>Admin Portal</Text>
        <Text style={styles.subtitle}>Secure access for OmniQ administrators</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Admin Email</Text>
          <Input placeholder="admin@omniq.in" />
          <Text style={styles.label}>Password</Text>
          <Input placeholder="••••••••••••" secureTextEntry />
          <Link href="/(buyer)" asChild>
            <Button style={styles.button}>Sign In to Admin Panel</Button>
          </Link>
        </View>
        <Text style={styles.footer}>Protected by OmniQ Security · <Text style={styles.accent}>2FA enabled</Text></Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center"
  },
  shield: {
    alignSelf: "center",
    width: 108,
    height: 108,
    borderRadius: 30,
    backgroundColor: "rgba(108,99,255,0.2)",
    borderColor: colors.accent,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28
  },
  shieldText: {
    fontSize: 42
  },
  title: {
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 17,
    marginTop: 10,
    marginBottom: 46
  },
  form: {
    gap: 12
  },
  label: {
    color: colors.textSecondary,
    fontWeight: "900",
    marginTop: 8
  },
  button: {
    marginTop: 18
  },
  footer: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 26
  },
  accent: {
    color: colors.accentLight
  }
});
