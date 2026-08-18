/**
 * OmniQ mobile app - cross-platform confirm and notice dialogs.
 *
 * `Alert.alert` from react-native is a no-op on react-native-web. The admin console is used in a
 * browser as much as on a phone, and there it meant a "Delete this campaign?" prompt never
 * appeared - so the delete simply did not happen, with no explanation - and an upload failure
 * showed nothing at all. These helpers pick the right primitive per platform so a confirmation is
 * always seen and a failure is always reported.
 *
 * Author: OmniQ Team
 */
import { Alert, Platform } from "react-native";

export type ConfirmOptions = {
  /** Label on the affirmative button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Renders the affirmative button in the destructive style on iOS. */
  destructive?: boolean;
};

/**
 * Asks, then runs `onConfirm` only if the operator agreed. Never throws: a platform without either
 * primitive falls through to running the action, which matches the previous native-only behaviour
 * rather than silently dropping it.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  options: ConfirmOptions = {}
): void {
  const { confirmLabel = "Confirm", destructive = true } = options;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }
    onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm }
  ]);
}

/** A one-way notice. Prefer inline feedback where a screen has room for it; use this for the rest. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message ? `${title}\n\n${message}` : title);
      return;
    }
    console.warn(`[OmniQ] ${title}${message ? `: ${message}` : ""}`);
    return;
  }
  Alert.alert(title, message);
}

/** Pulls the human-readable part out of an axios error, falling back through the usual shapes. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const anyError = error as any;
  return (
    anyError?.response?.data?.error?.message ||
    anyError?.response?.data?.message ||
    anyError?.message ||
    fallback
  );
}
