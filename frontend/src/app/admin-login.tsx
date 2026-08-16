/**
 * OmniQ mobile app - admin login screen.
 * Author: OmniQ Team
 */
import { useRef, useState } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View, Platform, TouchableOpacity, KeyboardAvoidingView, type TextInput } from "react-native";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { EyeIcon } from "@/components/ui/EyeIcon";
import { EyeOffIcon } from "@/components/ui/EyeOffIcon";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";
export default function AdminLoginScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Inline banner rather than Alert.alert: a failed admin login should leave the credentials on
  // screen to correct, not put a modal over them.
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setFormError("Enter both your admin email and password.");
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      const res = await apiClient.post("/auth/login", {
        email,
        password
      });
      if (res.data?.data?.session) {
        await supabase.auth.setSession({
          access_token: res.data.data.session.access_token,
          refresh_token: res.data.data.session.refresh_token
        });
        const userRole = res.data.data.session.user?.user_metadata?.role;
        if (userRole === "admin") {
          router.replace("/(admin)" as any);
        } else {
          // Sign back out first, then report: leaving a non-admin session live behind an
          // "access denied" message is the kind of gap that turns into a real one.
          await supabase.auth.signOut();
          setFormError("That account does not have administrator privileges.");
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err.message ||
        "Sign in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };
  return <Screen scroll={true} refreshable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%' }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
      <View style={styles.wrap}>
        <View style={styles.shield}>
          <ShieldIcon size={48} />
        </View>
        <Text style={styles.title}>Admin Portal</Text>
        <Text style={styles.subtitle}>Secure access for OmniQ administrators</Text>

        {formError ? (
          <View accessibilityRole="alert" style={styles.banner}>
            <Text style={styles.bannerText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <FormField
            label="Admin email"
            placeholder="admin@omniq.in"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <FormField
            ref={passwordRef}
            label="Password"
            placeholder="Your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                style={{ padding: 4 }}
              >
                {showPassword ? <EyeOffIcon color={colors.textSecondary} size={20} /> : <EyeIcon color={colors.textSecondary} size={20} />}
              </TouchableOpacity>
            }
          />
          <Button style={styles.button} onPress={handleLogin} loading={loading}>
            {loading ? "Authenticating..." : "Sign In to Admin Panel"}
          </Button>
        </View>
        <Link href={"/(auth)" as any} style={styles.backLink}>← Back to standard login</Link>
        <Text style={styles.footer}>Protected by OmniQ Security</Text>
      </View>
      </KeyboardAvoidingView>
    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  wrap: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  shield: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: `${colors.accent}1A`,
    borderColor: colors.accent,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary,
    textAlign: "center"
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32
  },
  banner: {
    backgroundColor: `${colors.danger}14`,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18
  },
  bannerText: {
    ...typography.caption,
    color: colors.danger,
    lineHeight: 19
  },
  form: {
    gap: 16
  },
  button: {
    marginTop: 6,
    minHeight: 56,
    borderRadius: 14
  },
  backLink: {
    ...typography.captionBold,
    color: colors.accent,
    textAlign: "center",
    marginTop: 28
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 22
  }
});
