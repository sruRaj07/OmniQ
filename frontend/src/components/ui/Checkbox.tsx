import React from "react";
import { TouchableOpacity, View, StyleSheet, TouchableOpacityProps } from "react-native";
import { useThemeColors } from "@/store/useThemeStore";

interface CheckboxProps extends TouchableOpacityProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Checkbox({ value, onValueChange, style, disabled, ...props }: CheckboxProps) {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.container,
        {
          borderColor: value ? colors.accent : colors.border2,
          backgroundColor: value ? colors.accent : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...props}
    >
      {value && (
        <View style={styles.checkIcon}>
          {/* A simple CSS-based checkmark to avoid missing SVG issues */}
          <View style={[styles.checkLeft, { backgroundColor: colors.bgPrimary }]} />
          <View style={[styles.checkRight, { backgroundColor: colors.bgPrimary }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    width: 12,
    height: 12,
    position: "relative",
    top: -1,
  },
  checkLeft: {
    position: "absolute",
    width: 3,
    height: 6,
    bottom: 2,
    left: 2,
    transform: [{ rotate: "-45deg" }],
  },
  checkRight: {
    position: "absolute",
    width: 3,
    height: 10,
    bottom: 2,
    left: 6,
    transform: [{ rotate: "45deg" }],
  },
});
