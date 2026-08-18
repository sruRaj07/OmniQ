/**
 * OmniQ mobile app - icon set for the seller portal.
 *
 * Grouped in one file on purpose: these are all 24x24 stroked glyphs sharing the same
 * geometry, and one module keeps the bundle a single small chunk instead of twenty
 * near-empty ones (the APK has a 40MB ceiling).
 *
 * Author: OmniQ Team
 */
import * as React from "react";
import Svg, { Circle, Path, Polyline, Rect, Line } from "react-native-svg";

export type SellerIconProps = {
  size?: number;
  color?: string;
  /** Stroke width in the 24x24 viewBox. Bump to 2.4 for small sizes that need to stay legible. */
  strokeWidth?: number;
};

/**
 * ⚡ PERFORMANCE: every icon is memoised. They sit inside list rows that re-render on
 * scroll, and the props are primitives, so the default shallow compare stops the SVG
 * subtree from being rebuilt.
 */
const stroked = (
  name: string,
  render: (props: Required<SellerIconProps>) => React.ReactNode,
  fill: "none" | "currentColor" = "none"
) => {
  const Icon = React.memo(function SellerIcon({ size = 22, color = "#2A2826", strokeWidth = 2 }: SellerIconProps) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill === "none" ? "none" : color}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {render({ size, color, strokeWidth })}
      </Svg>
    );
  });
  Icon.displayName = name;
  return Icon;
};

export const PlusIcon = stroked("PlusIcon", () => <Path d="M12 5v14M5 12h14" />);

export const TrendUpIcon = stroked("TrendUpIcon", () => (
  <>
    <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <Polyline points="17 6 23 6 23 12" />
  </>
));

export const TrendDownIcon = stroked("TrendDownIcon", () => (
  <>
    <Polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <Polyline points="17 18 23 18 23 12" />
  </>
));

export const TrendFlatIcon = stroked("TrendFlatIcon", () => <Path d="M5 12h14" />);

export const ChevronRightIcon = stroked("ChevronRightIcon", () => <Path d="M9 18l6-6-6-6" />);

export const ChevronDownIcon = stroked("ChevronDownIcon", () => <Path d="M6 9l6 6 6-6" />);

export const PackageIcon = stroked("PackageIcon", () => (
  <>
    <Path d="M16.5 9.4 7.5 4.21" />
    <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <Line x1="12" y1="22.08" x2="12" y2="12" />
  </>
));

export const CheckIcon = stroked("CheckIcon", () => <Path d="M20 6 9 17l-5-5" />);

export const CheckCircleIcon = stroked("CheckCircleIcon", () => (
  <>
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Polyline points="22 4 12 14.01 9 11.01" />
  </>
));

export const ClockIcon = stroked("ClockIcon", () => (
  <>
    <Circle cx="12" cy="12" r="9" />
    <Path d="M12 7v5l3.5 2" />
  </>
));

export const AlertIcon = stroked("AlertIcon", () => (
  <>
    <Path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <Line x1="12" y1="9" x2="12" y2="13" />
    <Line x1="12" y1="17" x2="12.01" y2="17" />
  </>
));

export const TruckIcon = stroked("TruckIcon", () => (
  <>
    <Path d="M1 4.5h14a1 1 0 0 1 1 1V16H1V5.5a1 1 0 0 1 1-1z" />
    <Path d="M16 9h3.6a1 1 0 0 1 .82.43L23 13v3h-7z" />
    <Circle cx="6" cy="18.5" r="2.2" />
    <Circle cx="18.5" cy="18.5" r="2.2" />
  </>
));

export const StarIcon = stroked("StarIcon", () => (
  <Path d="m12 2.5 2.9 5.87 6.48.95-4.69 4.57 1.11 6.45L12 17.29l-5.8 3.05 1.11-6.45L2.62 9.32l6.48-.95z" />
));

export const StoreIcon = stroked("StoreIcon", () => (
  <>
    <Path d="M3.5 9 5 3.5h14L20.5 9" />
    <Path d="M3.5 9v10.5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V9" />
    <Path d="M3.5 9h17" />
    <Path d="M9.5 20.5V14h5v6.5" />
  </>
));

export const PhoneIcon = stroked("PhoneIcon", () => (
  <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
));

export const MailIcon = stroked("MailIcon", () => (
  <>
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Path d="m22 6.5-9.4 6.2a1 1 0 0 1-1.1 0L2 6.5" />
  </>
));

export const MapPinIcon = stroked("MapPinIcon", () => (
  <>
    <Path d="M20 10.5c0 6.5-8 12.5-8 12.5s-8-6-8-12.5a8 8 0 0 1 16 0z" />
    <Circle cx="12" cy="10.3" r="2.8" />
  </>
));

export const TagIcon = stroked("TagIcon", () => (
  <>
    <Path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <Line x1="7" y1="7" x2="7.01" y2="7" />
  </>
));

export const ImageIcon = stroked("ImageIcon", () => (
  <>
    <Rect x="3" y="3" width="18" height="18" rx="2" />
    <Circle cx="8.5" cy="8.5" r="1.6" />
    <Path d="m21 15.5-4.6-4.6L5 21" />
  </>
));

export const XIcon = stroked("XIcon", () => <Path d="M18 6 6 18M6 6l12 12" />);

export const FilterIcon = stroked("FilterIcon", () => <Path d="M22 3H2l8 9.46V19l4 2v-8.54z" />);

export const SearchIcon = stroked("SearchIcon", () => (
  <>
    <Circle cx="11" cy="11" r="7" />
    <Path d="m20 20-3.7-3.7" />
  </>
));

export const ReceiptIcon = stroked("ReceiptIcon", () => (
  <>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Polyline points="14 2 14 8 20 8" />
    <Line x1="8.5" y1="13" x2="15.5" y2="13" />
    <Line x1="8.5" y1="17" x2="13" y2="17" />
  </>
));

export const WalletIcon = stroked("WalletIcon", () => (
  <>
    <Path d="M20 7H5a2 2 0 0 1 0-4h13v4" />
    <Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H5" />
    <Circle cx="16.5" cy="14" r="1.3" />
  </>
));

export const LogOutIcon = stroked("LogOutIcon", () => (
  <>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1="21" y1="12" x2="9" y2="12" />
  </>
));

export const SwapIcon = stroked("SwapIcon", () => (
  <>
    <Polyline points="17 2 21 6 17 10" />
    <Path d="M3 12V9a3 3 0 0 1 3-3h15" />
    <Polyline points="7 22 3 18 7 14" />
    <Path d="M21 12v3a3 3 0 0 1-3 3H3" />
  </>
));

export const ShieldCheckIcon = stroked("ShieldCheckIcon", () => (
  <>
    <Path d="M12 22s8-4 8-10V5.5l-8-3.5-8 3.5V12c0 6 8 10 8 10z" />
    <Polyline points="9 11.8 11.3 14 15 10" />
  </>
));

export const InfoIcon = stroked("InfoIcon", () => (
  <>
    <Circle cx="12" cy="12" r="9.5" />
    <Line x1="12" y1="11" x2="12" y2="16.5" />
    <Line x1="12" y1="7.8" x2="12.01" y2="7.8" />
  </>
));

export const CameraIcon = stroked("CameraIcon", () => (
  <>
    <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.2l1.6-2.5h6.4L16.8 6H20a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="3.6" />
  </>
));

export const ChartIcon = stroked("ChartIcon", () => (
  <>
    <Line x1="4" y1="20" x2="20" y2="20" />
    <Line x1="7.5" y1="20" x2="7.5" y2="12" />
    <Line x1="12" y1="20" x2="12" y2="7" />
    <Line x1="16.5" y1="20" x2="16.5" y2="15" />
  </>
));

export const InboxIcon = stroked("InboxIcon", () => (
  <>
    <Polyline points="21 9 21 20 3 20 3 9" />
    <Path d="M3 9 5.4 4.2A1 1 0 0 1 6.3 3.7h11.4a1 1 0 0 1 .9.5L21 9" />
    <Path d="M3 9h5l1.2 2.6h5.6L16 9h5" />
  </>
));

export const SlidersIcon = stroked("SlidersIcon", () => (
  <>
    <Line x1="4" y1="7" x2="20" y2="7" />
    <Line x1="4" y1="17" x2="20" y2="17" />
    <Circle cx="9.5" cy="7" r="2.4" />
    <Circle cx="15" cy="17" r="2.4" />
  </>
));
