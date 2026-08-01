/**
 * OmniQ mobile app - OTP Password Reset Screen.
 * Author: OmniQ Team
 */
import { useState } from "react";
import { StyleSheet, Text, View, Alert, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { supabase } from "@/lib/supabase";

export default function OtpResetScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const router = useRouter();
  
  // We passed the email from the sign-in screen
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [step, setStep] = useState<"otp" | "new_password">("otp");
  
  // OTP Form State
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // New Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit verification code.");
      return;
    }
    
    setIsVerifying(true);
    // Verifying type 'recovery' signs the user in so they can update their password
    const { error } = await supabase.auth.verifyOtp({
      email: email as string,
      token: otp,
      type: 'recovery'
    });
    setIsVerifying(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Success! Move to the next step
      setStep("new_password");
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdating(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Password changed successfully");
      
      // We log them out so they have to sign in with their new password 
      // (or you could just redirect them to the home screen if you want them to stay logged in)
      await supabase.auth.signOut();
      
      router.replace("/(auth)" as any);
    }
  };

  return (
    <Screen scroll={true}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === "otp" 
              ? `Enter the 6-digit code sent to ${email}` 
              : "Create a new strong password"}
          </Text>
        </View>

        {step === "otp" ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code (OTP)</Text>
              <Input 
                placeholder="6-digit code" 
                value={otp} 
                onChangeText={setOtp} 
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Button onPress={handleVerifyOtp} style={styles.submitButton}>
              {isVerifying ? "Verifying..." : "Verify Code"}
            </Button>
            
            <Button variant="secondary" onPress={() => router.replace("/(auth)" as any)} style={styles.cancelButton}>
              Back to Sign In
            </Button>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <Input 
                placeholder="At least 6 characters" 
                value={newPassword} 
                onChangeText={setNewPassword} 
                secureTextEntry 
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <Input 
                placeholder="Confirm your new password" 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                secureTextEntry 
              />
            </View>

            <Button onPress={handleUpdatePassword} style={styles.submitButton}>
              {isUpdating ? "Updating..." : "Update Password"}
            </Button>
          </View>
        )}
      </View>
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  hero: {
    marginBottom: 40,
    alignItems: 'flex-start'
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24
  },
  form: {
    gap: 20
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: "700",
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  submitButton: {
    marginTop: 8
  },
  cancelButton: {
    marginTop: 8
  }
});
