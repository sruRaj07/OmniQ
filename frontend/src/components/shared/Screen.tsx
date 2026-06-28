/**
 * OmniQ mobile app - common screen wrapper.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = (
    <View style={styles.inner}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>9:41</Text>
        <Text style={styles.statusText}>5G ▰</Text>
      </View>
      {children}
    </View>
  );
  return scroll ? (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {content}
    </ScrollView>
  ) : (
    <View style={styles.root}>{content}</View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  content: {
    paddingBottom: 28
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 18
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "800"
  }
});
