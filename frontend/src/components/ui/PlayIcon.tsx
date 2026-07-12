import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

export const PlayIcon = (props: SvgProps & { size?: number }) => (
  <Svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Path d="m5 3 14 9-14 9V3z" />
  </Svg>
);
