/**
 * OmniQ mobile app - loading view.
 * Author: OmniQ Team
 */
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accentLight} />
      <Text style={styles.text}>Loading OmniQ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
