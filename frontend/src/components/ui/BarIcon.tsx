import * as React from "react";
import Svg, { Rect, SvgProps } from "react-native-svg";

export const BarIcon = (props: SvgProps) => (
  <Svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color || "currentColor"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Rect x="18" y="3" width="4" height="18" />
    <Rect x="10" y="8" width="4" height="13" />
    <Rect x="2" y="13" width="4" height="8" />
  </Svg>
);
