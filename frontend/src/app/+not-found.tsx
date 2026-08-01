/**
 * OmniQ mobile app - not found route.
 * Author: OmniQ Team
 */
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { useThemeColors } from "@/store/useThemeStore";
export default function NotFoundScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  return <View style={styles.root}>
      <Text style={styles.title}>Screen not found</Text>
      <Link href="/(buyer)" asChild>
        <Button>Go Home</Button>
      </Link>
    </View>;
}
const getStyles = (colors: any) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    gap: 18
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700"
  }
});