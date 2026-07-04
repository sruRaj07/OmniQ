/**
 * OmniQ mobile app - admin login screen.
 * Author: OmniQ Team
 */
import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, Alert } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      
      if (res.data?.data?.session) {
        await supabase.auth.setSession({
          access_token: res.data.data.session.access_token,
          refresh_token: res.data.data.session.refresh_token,
        });
        
        const userRole = res.data.data.session.user?.user_metadata?.role;
        if (userRole === "admin") {
          router.replace("/(admin)" as any);
        } else {
          Alert.alert("Access Denied", "You do not have administrator privileges.");
          await supabase.auth.signOut();
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      Alert.alert("Admin Login Failed", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.shield}><Text style={styles.shieldText}>🛡</Text></View>
        <Text style={styles.title}>Admin Portal</Text>
        <Text style={styles.subtitle}>Secure access for OmniQ administrators</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Admin Email</Text>
          <Input 
            placeholder="admin@omniq.in" 
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Password</Text>
          <Input 
            placeholder="••••••••••••" 
            secureTextEntry 
            value={password}
            onChangeText={setPassword}
          />
          <Button style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Admin Panel"}
          </Button>
        </View>
        <Link href={"/(auth)/sign-in" as any} style={styles.backLink}>← Back to standard login</Link>
        <Text style={styles.footer}>Protected by OmniQ Security</Text>
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
  backLink: {
    color: colors.accentLight,
    textAlign: "center",
    marginTop: 24,
    fontWeight: "800",
    fontSize: 16
  },
  footer: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 26
  }
});
