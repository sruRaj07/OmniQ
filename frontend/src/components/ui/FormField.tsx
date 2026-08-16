/**
 * OmniQ mobile app - labelled text field with inline validation.
 *
 * A persistent label above the box rather than a placeholder-only field: the placeholder vanishes
 * the moment someone types, so on a half-filled form there is nothing left saying what each box
 * was for. Errors sit under the field they belong to instead of in a modal alert.
 *
 * Author: OmniQ Team
 */
import React, { forwardRef, useMemo } from "react";
import { StyleSheet, Text, View, type TextInput, type ViewStyle } from "react-native";
import { Input, type InputProps } from "@/components/ui/Input";
import { useThemeColors } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";

export interface FormFieldProps extends InputProps {
  label: string;
  /** Validation message. Present means invalid: the box turns red and this renders below it. */
  error?: string;
  /** Always-visible guidance, e.g. a format rule. Hidden while an error is showing. */
  hint?: string;
  containerStyle?: ViewStyle;
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, error, hint, containerStyle, ...inputProps },
  ref
) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Input
        ref={ref}
        accessibilityLabel={label}
        // Announces the message to a screen reader instead of leaving the field silently red.
        accessibilityHint={error ?? hint}
        style={error ? styles.invalid : undefined}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    gap: 7
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginLeft: 2
  },
  invalid: {
    borderColor: colors.danger
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginLeft: 2
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 2
  }
});
