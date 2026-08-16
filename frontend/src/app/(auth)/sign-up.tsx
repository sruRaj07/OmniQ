/**
 * OmniQ mobile app - account creation screen.
 * Author: OmniQ Team
 */
import { useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/Checkbox";
import { Screen } from "@/components/shared/Screen";
import { TermsModal } from "@/components/shared/TermsModal";
import { useThemeColors } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";
WebBrowser.maybeCompleteAuthSession();

const MIN_PASSWORD_LENGTH = 6;
/** Length at which the meter reports "strong". Below this, extra character classes cap it at "good". */
const STRONG_PASSWORD_LENGTH = 10;

const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address").endsWith("@gmail.com", "OmniQ accounts use a @gmail.com address"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  role: z.enum(["buyer", "seller"]).default("buyer"),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and privacy policy" })
  })
});
type SignUpFormData = z.infer<typeof signUpSchema>;

/**
 * Password strength, scored on length plus character variety.
 *
 * ⚡ PERFORMANCE: four regex tests over a string that is never more than a few dozen characters,
 * memoized on the value. Cheaper than pulling in a strength library we would also have to ship
 * inside the 40MB APK budget.
 */
function scorePassword(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: "" };
  let variety = 0;
  if (/[a-z]/.test(password)) variety++;
  if (/[A-Z]/.test(password)) variety++;
  if (/[0-9]/.test(password)) variety++;
  if (/[^a-zA-Z0-9]/.test(password)) variety++;

  if (password.length < MIN_PASSWORD_LENGTH) return { level: 1, label: "Too short" };
  if (password.length >= STRONG_PASSWORD_LENGTH && variety >= 3) return { level: 3, label: "Strong password" };
  if (variety >= 2) return { level: 2, label: "Good - add a symbol or capital to strengthen it" };
  return { level: 1, label: "Weak - mix in numbers and capitals" };
}

export default function SignUpScreen() {
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
  const [isTermsVisible, setIsTermsVisible] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  // Failures render inline above the form rather than in a modal alert, so the field that caused
  // them stays visible and editable.
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {
      errors
    }
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: role as any || "buyer",
      acceptedTerms: false as any
    }
  });

  const passwordValue = watch("password");
  const strength = useMemo(() => scorePassword(passwordValue), [passwordValue]);

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    setFormError(null);
    try {
      const res = await apiClient.post("/auth/signup", data);
      if (res.data?.data?.session) {
        // The sign-in screen is the (auth) group's index route - there is no /sign-in file.
        router.replace({
          pathname: "/(auth)",
          params: {
            role: data.role,
            justSignedUp: "1"
          }
        } as any);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error?.message || err.message || "";
      if (errorMessage.toLowerCase().includes("already registered") || errorMessage.toLowerCase().includes("already exists")) {
        setFormError("That email is already registered. Sign in instead, or use a different address.");
      } else {
        setFormError(errorMessage || "We couldn't create your account. Please try again.");
      }
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
      } catch (err: any) {
        setFormError(err.message);
      }
    }
    setGoogleLoading(false);
  };
  return <Screen scroll={true} refreshable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%' }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <View style={styles.roleRow}>
            <Text style={styles.subtitle}>Joining OmniQ as a</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{(role || 'buyer').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <Button
          variant="secondary"
          onPress={handleGoogleAuth}
          loading={googleLoading}
          icon={<GoogleIcon size={20} />}
          style={styles.googleButton}
        >
          {googleLoading ? "Opening Google..." : "Sign up with Google"}
        </Button>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or use your email</Text>
          <View style={styles.dividerLine} />
        </View>

        {formError ? (
          <View accessibilityRole="alert" style={styles.banner}>
            <Text style={styles.bannerText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Controller control={control} name="fullName" render={({
          field: {
            onChange,
            onBlur,
            value
          }
        }) => <FormField
                label="Full name"
                placeholder="Your name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
              />} />

          <Controller control={control} name="email" render={({
          field: {
            onChange,
            onBlur,
            value
          }
        }) => <FormField
                ref={emailRef}
                label="Email"
                placeholder="you@gmail.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                // Stated up front rather than only after a rejected submit.
                hint="OmniQ accounts use a @gmail.com address"
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
        }) => <View>
                <FormField
                  ref={passwordRef}
                  label="Password"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
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
                {strength.level > 0 && !errors.password ? (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthTrack}>
                      {[1, 2, 3].map(segment => (
                        <View
                          key={segment}
                          style={[
                            styles.strengthSegment,
                            segment <= strength.level && {
                              backgroundColor: strength.level === 3 ? colors.success : strength.level === 2 ? colors.warning : colors.danger
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.strengthLabel}>{strength.label}</Text>
                  </View>
                ) : null}
              </View>} />

          <Controller control={control} name="acceptedTerms" render={({
            field: { onChange, value }
          }) => (
            <View style={styles.termsBlock}>
              <View style={styles.termsRow}>
                <Checkbox
                  value={value}
                  accessibilityLabel="Accept terms of service and privacy policy"
                  onValueChange={(val) => {
                    if (!hasReadTerms && val) {
                      setIsTermsVisible(true);
                    } else {
                      onChange(val);
                    }
                  }}
                />
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text onPress={() => setIsTermsVisible(true)} style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text onPress={() => setIsTermsVisible(true)} style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
              {errors.acceptedTerms && <Text style={styles.error}>{errors.acceptedTerms.message}</Text>}
            </View>
          )} />

          <Button onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitButton}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          {/* The sign-in screen is the (auth) group index, not a /sign-in route. */}
          <Link href={"/(auth)" as any} style={styles.link}>Sign In</Link>
        </View>
      </View>
      </KeyboardAvoidingView>

      <TermsModal
        visible={isTermsVisible}
        onClose={() => setIsTermsVisible(false)}
        onAccept={() => {
          setHasReadTerms(true);
          setIsTermsVisible(false);
          setValue("acceptedTerms", true, { shouldValidate: true });
        }}
      />
    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  header: {
    marginBottom: 24
  },
  title: {
    ...typography.heading1,
    color: colors.textPrimary
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary
  },
  roleBadge: {
    backgroundColor: `${colors.accent}1A`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  roleBadgeText: {
    ...typography.small,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.accent
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
  form: {
    gap: 16
  },
  strengthRow: {
    marginTop: 8,
    gap: 6
  },
  strengthTrack: {
    flexDirection: "row",
    gap: 5
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.bgTertiary
  },
  strengthLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 2
  },
  termsBlock: {
    marginTop: 2
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  termsText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20
  },
  termsLink: {
    color: colors.accent,
    fontWeight: "700"
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 6,
    marginLeft: 2
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
  }
});
