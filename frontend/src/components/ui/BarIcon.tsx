import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

export const BarIcon = (props: SvgProps & { size?: number }) => (
  <Svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill={props.color || "currentColor"} {...props}>
    <Path d="M5 22h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H5C3.9 2 3 2.9 3 4v16c0 1.1.9 2 2 2zM7 18v-4h2v4H7zm4 0v-8h2v8h-2zm4 0V8h2v10h-2z" />
  </Svg>
);
