/**
 * OmniQ mobile app - Email/Password and Google sign-in screen.
 * Author: OmniQ Team
 */
import { useState } from "react";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, Alert, Platform, TouchableOpacity, Modal, KeyboardAvoidingView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EyeIcon } from "@/components/ui/EyeIcon";
import { EyeOffIcon } from "@/components/ui/EyeOffIcon";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";
WebBrowser.maybeCompleteAuthSession();
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
type SignInFormData = z.infer<typeof signInSchema>;
export default function SignInScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const {
    role
  } = useLocalSearchParams<{
    role?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: {
      errors
    }
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", data);
      if (res.data?.data?.session) {
        await supabase.auth.setSession({
          access_token: res.data.data.session.access_token,
          refresh_token: res.data.data.session.refresh_token
        });
        const userRole = res.data.data.session.user?.user_metadata?.role;
        if (userRole === "admin") {
          router.replace("/(admin)" as any);
        } else {
          router.replace(role === "seller" ? "/(seller)" as any : "/(buyer)" as any);
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      Alert.alert("Sign In Failed", err?.response?.data?.error?.message || err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    const isWeb = Platform.OS === "web";
    const redirectUri = Linking.createURL('/');
    const {
      data,
      error
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: !isWeb
      }
    });
    if (error) {
      Alert.alert("Google Auth Failed", error.message);
      setGoogleLoading(false);
      return;
    }
    if (!isWeb && data?.url) {
      try {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        // Supabase v2 will handle the session implicitly on redirect
      } catch (err: any) {
        Alert.alert("Browser Error", err.message);
      }
    }
    setGoogleLoading(false);
  };

  return <Screen scroll={true}>
    <KeyboardAvoidingView 
      style={{ flex: 1, width: '100%' }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Omni<Text style={styles.logoAccent}>Q</Text></Text>
        <Text style={styles.tagline}>EVERYTHING. EVERYWHERE.</Text>
      </View>

      <View style={styles.form}>
        <Button variant="secondary" onPress={handleGoogleAuth} style={styles.googleButton}>
          {googleLoading ? "Redirecting..." : "G  Continue with Google"}
        </Button>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Controller control={control} name="email" render={({
          field: {
            onChange,
            value
          }
        }) => <View style={styles.inputGroup}>
            <Input placeholder="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" />
            {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
          </View>} />

        <Controller control={control} name="password" render={({
          field: {
            onChange,
            value
          }
        }) => <View style={styles.inputGroup}>
            <Input 
              placeholder="Password" 
              value={value} 
              onChangeText={onChange} 
              secureTextEntry={!showPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? <EyeOffIcon color={colors.textSecondary} size={20} /> : <EyeIcon color={colors.textSecondary} size={20} />}
                </TouchableOpacity>
              }
            />
            {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
          </View>} />

        <Button onPress={handleSubmit(onSubmit)} style={styles.submitButton}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href={{
          pathname: "/(auth)/sign-up",
          params: {
            role
          }
        } as any} style={styles.link}>Sign Up</Link>
      </View>

      <Link href={"/(buyer)" as any} style={styles.skip}>Browse without signing in →</Link>
      <Link href={"/admin-login" as any} style={styles.admin}>Admin portal</Link>
    </View>
    </KeyboardAvoidingView>
  </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  hero: {
    alignItems: "center",
    marginBottom: 40
  },
  logo: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900"
  },
  logoAccent: {
    color: colors.accent
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 8
  },
  form: {
    gap: 20
  },
  googleButton: {
    marginBottom: 10,
    minHeight: 56
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border2
  },
  dividerText: {
    color: colors.textMuted,
    paddingHorizontal: 14,
    fontWeight: "600"
  },
  inputGroup: {
    marginBottom: 4
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4
  },
  submitButton: {
    marginTop: 10,
    minHeight: 56
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 30
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 16
  },
  link: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700"
  },
  skip: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    fontWeight: "600"
  },
  admin: {
    color: colors.accent,
    textAlign: "center",
    marginTop: 16,
    fontSize: 13,
    fontWeight: "700"
  }
});