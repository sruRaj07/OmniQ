import * as React from "react";
import Svg, { Path, Defs, LinearGradient, Stop, SvgProps } from "react-native-svg";

export const ShieldIcon = (props: SvgProps & { size?: number }) => (
  <Svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" {...props}>
    <Defs>
      <LinearGradient id="shieldGradLeft" x1="0" y1="0" x2="0" y2="24">
        <Stop offset="0%" stopColor="#F56565" />
        <Stop offset="100%" stopColor="#C53030" />
      </LinearGradient>
      <LinearGradient id="shieldGradRight" x1="0" y1="0" x2="0" y2="24">
        <Stop offset="0%" stopColor="#E2E8F0" />
        <Stop offset="100%" stopColor="#A0AEC0" />
      </LinearGradient>
    </Defs>
    {/* Right side silver */}
    <Path d="M12 2L20 5v7c0 6-8 10-8 10V2z" fill="url(#shieldGradRight)" stroke="#718096" strokeWidth="0.5" />
    {/* Left side red */}
    <Path d="M12 2L4 5v7c0 6 8 10 8 10V2z" fill="url(#shieldGradLeft)" stroke="#9B2C2C" strokeWidth="0.5" />
    {/* Inner detail (jagged white/red split) */}
    <Path d="M12 4.5l4.5 1.7v5.3c0 3.5-4.5 6.5-4.5 6.5V4.5z" fill="#FFFFFF" opacity={0.9} />
    <Path d="M12 6L9 9h3v3H9l3 3v2l-4-4v-4l3-3z" fill="#C53030" />
  </Svg>
);
