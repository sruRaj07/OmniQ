/**
 * OmniQ mobile app - top-level crash fallback.
 *
 * This is the last thing between a thrown render error and a blank screen, so it does three
 * things the previous version did not: log the error, offer a way out that is not "restart the
 * app", and in development show what actually broke instead of a generic apology.
 *
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { Component, type ErrorInfo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { lightTheme } from "@/constants/colors";
import { typography } from "@/constants/typography";

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  // Without this the error was swallowed entirely - no message anywhere, in dev or in production.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[OmniQ] Unhandled render error:", error?.message || error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const detail = this.state.error?.message;
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.text}>
            This screen failed to load. Try again, and restart OmniQ if it keeps happening.
          </Text>

          {/* Dev only: shipping a raw stack message to buyers tells them nothing and can leak
              internals. In development it is the difference between a fix and a guess. */}
          {__DEV__ && detail ? (
            <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
              <Text style={styles.detailText}>{detail}</Text>
            </ScrollView>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={this.handleRetry}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

// A static theme object, not the hook: this renders when the tree below it has already failed,
// so it must not depend on any provider or store still being healthy. lightTheme matches what
// useThemeColors serves the rest of the app.
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTheme.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    ...typography.heading2,
    color: lightTheme.textPrimary,
    textAlign: "center"
  },
  text: {
    ...typography.body,
    color: lightTheme.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21
  },
  detailBox: {
    maxHeight: 160,
    alignSelf: "stretch",
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: lightTheme.bgTertiary
  },
  detailContent: {
    padding: 12
  },
  detailText: {
    ...typography.caption,
    color: lightTheme.danger
  },
  button: {
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTheme.accent
  },
  buttonPressed: {
    opacity: 0.85
  },
  buttonText: {
    ...typography.button,
    color: "#FFFFFF"
  }
});
