import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

export const PauseIcon = (props: SvgProps & { size?: number }) => (
  <Svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Path d="M14 4h4v16h-4z" />
    <Path d="M6 4h4v16H6z" />
  </Svg>
);
