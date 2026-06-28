/**
 * OmniQ mobile app - text input field.
 * Author: OmniQ Team
 */
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors } from "@/constants/colors";

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderColor: colors.border2,
    borderWidth: 1,
    color: colors.textPrimary,
    paddingHorizontal: 22,
    fontSize: 18,
    fontWeight: "600"
  }
});
