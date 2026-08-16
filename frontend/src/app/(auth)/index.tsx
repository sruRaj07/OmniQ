/**
 * OmniQ mobile app - Email/Password and Google sign-in screen.
 * Author: OmniQ Team
 */
import { useRef, useState } from "react";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, Platform, TouchableOpacity, KeyboardAvoidingView, type TextInput } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { EyeIcon } from "@/components/ui/EyeIcon";
import { EyeOffIcon } from "@/components/ui/EyeOffIcon";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";
WebBrowser.maybeCompleteAuthSession();
const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
type SignInFormData = z.infer<typeof signInSchema>;

/**
 * Server messages are written for developers. These are the two failures a real person actually
 * hits, rewritten to say what to do next; anything else falls through unchanged.
 */
function readableAuthError(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "That email and password don't match. Check them and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email address first - check your inbox for the link we sent.";
  }
  return raw || "Something went wrong. Please try again.";
}

export default function SignInScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const {
    role,
    justSignedUp
  } = useLocalSearchParams<{
    role?: string;
    justSignedUp?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Failures render in a banner above the form. A modal alert hides the field it is complaining
  // about and has to be dismissed before the user can correct anything.
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    getValues,
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
    setFormError(null);
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
      setFormError(readableAuthError(err?.response?.data?.error?.message || err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setFormError(null);
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
      setFormError(error.message);
      setGoogleLoading(false);
      return;
    }
    if (!isWeb && data?.url) {
      try {
        await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        // Supabase v2 will handle the session implicitly on redirect
      } catch (err: any) {
        setFormError(err.message);
      }
    }
    setGoogleLoading(false);
  };

  // Sends the recovery code, then hands off to the OTP screen that already exists at /otp-reset.
  const handleForgotPassword = async () => {
    const email = getValues("email").trim();
    if (!email || !z.string().email().safeParse(email).success) {
      setFormError("Enter your email address above, then tap 'Forgot password?'.");
      return;
    }
    setFormError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setFormError(error.message);
      return;
    }
    setResetSent(true);
    router.push({ pathname: "/otp-reset", params: { email } } as any);
  };

  return <Screen scroll={true} refreshable={false}>
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

      <View style={styles.intro}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          {role === "seller" ? "Sign in to manage your store." : "Sign in to pick up where you left off."}
        </Text>
      </View>

      <Button
        variant="secondary"
        onPress={handleGoogleAuth}
        loading={googleLoading}
        icon={<GoogleIcon size={20} />}
        style={styles.googleButton}
      >
        {googleLoading ? "Opening Google..." : "Continue with Google"}
      </Button>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or sign in with email</Text>
        <View style={styles.dividerLine} />
      </View>

      {formError ? (
        <View accessibilityRole="alert" style={styles.banner}>
          <Text style={styles.bannerText}>{formError}</Text>
        </View>
      ) : null}

      {/* Replaces the modal alert the sign-up screen used to fire: the confirmation lands on the
          screen the user was sent to, instead of blocking it. */}
      {resetSent || justSignedUp === "1" ? (
        <View accessibilityRole="alert" style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            {resetSent
              ? "We sent a reset code to your email."
              : "Account created. Sign in to get started."}
          </Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Controller control={control} name="email" render={({
          field: {
            onChange,
            onBlur,
            value
          }
        }) => <FormField
            label="Email"
            placeholder="you@example.com"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />} />

        <Controller control={control} name="password" render={({
          field: {
            onChange,
            onBlur,
            value
          }
        }) => <FormField
            ref={passwordRef}
            label="Password"
            placeholder="Your password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit(onSubmit)}
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
          />} />

        <TouchableOpacity
          onPress={handleForgotPassword}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          style={styles.forgotWrap}
        >
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <Button onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitButton}>
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

      <View style={styles.secondaryActions}>
        <Link href={"/(buyer)" as any} style={styles.skip}>Browse without signing in →</Link>
        <Link href={"/admin-login" as any} style={styles.admin}>Admin portal</Link>
      </View>
    </View>
    </KeyboardAvoidingView>
  </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  hero: {
    alignItems: "center",
    marginBottom: 28
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
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginTop: 8
  },
  intro: {
    marginBottom: 22
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6
  },
  googleButton: {
    minHeight: 56,
    borderRadius: 14
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border2
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: 12
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
  noticeBanner: {
    backgroundColor: `${colors.success}14`,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18
  },
  noticeText: {
    ...typography.caption,
    color: colors.success,
    lineHeight: 19
  },
  form: {
    gap: 16
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -4
  },
  forgot: {
    ...typography.captionBold,
    color: colors.accent
  },
  submitButton: {
    marginTop: 6,
    minHeight: 56,
    borderRadius: 14
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary
  },
  link: {
    ...typography.bodyBold,
    color: colors.accent,
    fontWeight: "700"
  },
  secondaryActions: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 14
  },
  skip: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textAlign: "center"
  },
  admin: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center"
  }
});
