/**
 * OmniQ mobile app - text input field.
 * Author: OmniQ Team
 */
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
export interface InputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
export function Input({
  leftIcon,
  rightIcon,
  style,
  ...props
}: InputProps) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  if (leftIcon || rightIcon) {
    return <View style={[styles.inputContainer, style as any]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput placeholderTextColor={colors.textMuted} {...props} style={styles.inputWithIcon} />
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>;
  }
  return <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, style]} />;
}
const getStyles = (colors: any) => StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderColor: colors.border2,
    borderWidth: 1,
    paddingHorizontal: 16
  },
  iconContainer: {
    marginRight: 8
  },
  rightIconContainer: {
    marginLeft: 8
  },
  inputWithIcon: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    ...typography.input,
  },
  input: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderColor: colors.border2,
    borderWidth: 1,
    color: colors.textPrimary,
    paddingHorizontal: 16,
    ...typography.input,
  }
});