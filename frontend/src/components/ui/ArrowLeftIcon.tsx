import React from "react";
import Svg, { Path } from "react-native-svg";
import { useAppTheme } from "@/store/useThemeStore";

export function ArrowLeftIcon({ color, size = 26 }: { color?: string; size?: number }) {
  const { colors } = useAppTheme();
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color || colors.textPrimary} 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
