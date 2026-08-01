/**
 * OmniQ mobile app - loading view.
 * Author: OmniQ Team
 */
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";
export function LoadingScreen() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  return <View style={styles.root}>
      <ActivityIndicator color={colors.accentLight} />
      <Text style={styles.text}>Loading OmniQ</Text>
    </View>;
}
const getStyles = (colors: any) => StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgPrimary
  },
  text: {
    color: colors.textSecondary,
    marginTop: 12
  }
});