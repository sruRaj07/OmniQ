import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";

export default function PendingApprovalScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏳</Text>
        </View>
        <Text style={styles.title}>Under Review</Text>
        <Text style={styles.subtitle}>
          Your seller application has been submitted and is currently under review by our admin team.
        </Text>
        <Text style={styles.subtitle}>
          This usually takes 24-48 hours. We will notify you once your account is approved.
        </Text>
        
        <Button onPress={() => router.push("/(buyer)/profile" as any)} style={styles.btn}>
          Back to Profile
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  btn: {
    marginTop: 20,
    width: "100%",
  }
});
