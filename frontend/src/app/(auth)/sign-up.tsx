import { useState } from "react";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, Alert, Platform } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";

WebBrowser.maybeCompleteAuthSession();

const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["buyer", "seller"]).default("buyer"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: (role as any) || "buyer",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/signup", data);
      
      if (res.data?.data?.session) {
        Alert.alert("Success", "Account created successfully! Please sign in to continue.");
        router.replace({ 
          pathname: "/(auth)/sign-in", 
          params: { role: data.role } 
        } as any);
      } else {
        throw new Error("Invalid response from server");
      }
      
    } catch (err: any) {
      Alert.alert("Sign up failed", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    const isWeb = Platform.OS === "web";
    const redirectUri = Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: !isWeb,
      },
    });

    if (error) {
      Alert.alert("Google Auth Failed", error.message);
      setGoogleLoading(false);
      return;
    }

    if (!isWeb && data?.url) {
      try {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      } catch (err: any) {
        Alert.alert("Browser Error", err.message);
      }
    }
    setGoogleLoading(false);
  };

  return (
    <Screen scroll={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join OmniQ as a <Text style={{fontWeight: 'bold'}}>{role || 'buyer'}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Button 
            variant="secondary" 
            onPress={handleGoogleAuth} 
            style={styles.googleButton}
          >
            {googleLoading ? "Redirecting..." : "G  Sign up with Google"}
          </Button>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Input
                  placeholder="Full Name"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                />
                {errors.fullName && <Text style={styles.error}>{errors.fullName.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Input
                  placeholder="Email"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Input
                  placeholder="Password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                />
                {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
              </View>
            )}
          />

          <Button 
            onPress={handleSubmit(onSubmit)} 
            style={styles.submitButton}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href={"/(auth)/sign-in" as any} style={styles.link}>Sign In</Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  form: {
    gap: 20,
  },
  googleButton: {
    marginBottom: 10,
    minHeight: 56,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border2,
  },
  dividerText: {
    color: colors.textMuted,
    paddingHorizontal: 14,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 10,
    minHeight: 56,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  link: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "800",
  },
});
