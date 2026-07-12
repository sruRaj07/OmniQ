import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/shared/Screen";
import { useAppTheme } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { supabase } from "@/lib/supabase";
const otpSchema = z.object({
  otp: z.string().length(4, "OTP must be exactly 4 digits").regex(/^\d+$/, "OTP must contain only numbers")
});
type OtpFormData = z.infer<typeof otpSchema>;
export default function VerifyOtpScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const {
    email,
    role
  } = useLocalSearchParams<{
    email: string;
    role?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: {
      errors
    }
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: ""
    }
  });
  const onSubmit = async (data: OtpFormData) => {
    if (!email) {
      Alert.alert("Error", "Missing email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/verify-otp", {
        email,
        otp: data.otp
      });

      // Store the session returned by the backend
      if (res.data?.data?.session) {
        await supabase.auth.setSession({
          access_token: res.data.data.session.access_token,
          refresh_token: res.data.data.session.refresh_token
        });
      } else {
        throw new Error("Invalid response from server");
      }
      Alert.alert("Success", "Authentication successful!");
      router.replace(role === "seller" ? "/(seller)" as any : "/(buyer)" as any);
    } catch (err: any) {
      Alert.alert("Verification Failed", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };
  return <Screen scroll={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Two-Factor Auth</Text>
          <Text style={styles.subtitle}>
            Enter the 4-digit code we sent to{"\n"}
            <Text style={{
            fontWeight: 'bold'
          }}>{email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Controller control={control} name="otp" render={({
          field: {
            onChange,
            value
          }
        }) => <View style={styles.inputGroup}>
                <Input placeholder="Enter 4-digit OTP" value={value} onChangeText={onChange} keyboardType="number-pad" maxLength={4} style={styles.otpInput} />
                {errors.otp && <Text style={styles.error}>{errors.otp.message}</Text>}
              </View>} />

          <Button onPress={handleSubmit(onSubmit)} style={styles.submitButton}>
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>
        </View>
      </View>
    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20
  },
  header: {
    marginBottom: 40,
    alignItems: "center"
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24
  },
  form: {
    gap: 20
  },
  inputGroup: {
    marginBottom: 4
  },
  otpInput: {
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 10,
    fontWeight: "bold"
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center"
  },
  submitButton: {
    marginTop: 10,
    minHeight: 56
  }
});