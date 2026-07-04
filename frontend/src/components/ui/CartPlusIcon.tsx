import * as React from "react";
import Svg, { Circle, Path, Line, SvgProps } from "react-native-svg";

export const CartPlusIcon = (props: SvgProps) => (
  <Svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Circle cx="9" cy="21" r="1" />
    <Circle cx="20" cy="21" r="1" />
    <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    <Line x1="11" y1="10" x2="15" y2="10" />
    <Line x1="13" y1="8" x2="13" y2="12" />
  </Svg>
);
