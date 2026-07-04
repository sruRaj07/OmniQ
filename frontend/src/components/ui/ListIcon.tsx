import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

export const ListIcon = (props: SvgProps) => (
  <Svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Path d="M8 6h13" />
    <Path d="M8 12h13" />
    <Path d="M8 18h13" />
    <Path d="M3 6h.01" />
    <Path d="M3 12h.01" />
    <Path d="M3 18h.01" />
  </Svg>
);
