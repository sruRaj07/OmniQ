/**
 * OmniQ mobile app - lightweight error fallback.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { Component } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.text}>Please restart OmniQ and try again.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900"
  },
  text: {
    color: colors.textSecondary,
    marginTop: 8
  }
});
