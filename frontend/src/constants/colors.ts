/**
 * OmniQ mobile app - design tokens.
 * Author: OmniQ Team
 */
export const darkTheme = {
  bgPrimary: "#0A0A0F",
  bgSecondary: "#12121A",
  bgTertiary: "#1A1A26",
  card: "#1E1E2E",
  card2: "#252538",
  border: "#2A2A3E",
  border2: "#353550",
  accent: "#6C63FF",
  accentLight: "#8B85FF",
  gold: "#D4AF37",
  goldLight: "#F0D060",
  textPrimary: "#F0F0FF",
  textSecondary: "#A0A0C0",
  textMuted: "#606080",
  success: "#22C55E",
  danger: "#FF4D6D",
  warning: "#F59E0B"
} as const;

export const lightTheme = {
  bgPrimary: "#FCFCFA",
  bgSecondary: "#F5F4F0",
  bgTertiary: "#EBE9E4",
  card: "#FFFFFF",
  card2: "#FAF9F7",
  border: "#D6D3CC",
  border2: "#BDBAB3",
  accent: "#4F46E5",
  accentLight: "#6366F1",
  gold: "#D4AF37",
  goldLight: "#F0D060",
  textPrimary: "#2A2826",
  textSecondary: "#5C5955",
  textMuted: "#8C8883",
  success: "#16A34A",
  danger: "#E11D48",
  warning: "#D97706"
} as const;

export type ThemeColors = typeof darkTheme | typeof lightTheme;
// Temporary fallback for backwards compatibility during refactor
export const colors: ThemeColors = darkTheme;
