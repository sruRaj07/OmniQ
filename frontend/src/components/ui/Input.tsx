/**
 * OmniQ mobile app - text input field.
 * Author: OmniQ Team
 */
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@/constants/colors";

export interface InputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ leftIcon, rightIcon, style, ...props }: InputProps) {
  if (leftIcon || rightIcon) {
    return (
      <View style={[styles.inputContainer, style]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput placeholderTextColor={colors.textMuted} {...props} style={styles.inputWithIcon} />
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>
    );
  }
  return <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, style]} />;
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderColor: colors.border2,
    borderWidth: 1,
    paddingHorizontal: 22,
  },
  iconContainer: {
    marginRight: 10,
  },
  rightIconContainer: {
    marginLeft: 10,
  },
  inputWithIcon: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
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
