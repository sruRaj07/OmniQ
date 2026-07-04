import * as React from "react";
import Svg, { Circle, SvgProps } from "react-native-svg";

export const MoreVerticalIcon = (props: SvgProps & { size?: number }) => (
  <Svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Circle cx="12" cy="12" r="1.5" />
    <Circle cx="12" cy="5" r="1.5" />
    <Circle cx="12" cy="19" r="1.5" />
  </Svg>
);
