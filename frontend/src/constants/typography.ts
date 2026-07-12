/**
 * OmniQ mobile app - typography scale.
 * Amazon-inspired consistent type system.
 * Author: OmniQ Team
 */
import { TextStyle } from "react-native";

/** Canonical font-size + weight tokens used across every screen. */
export const typography = {
  /** Page titles: Dashboard, Cart, Profile, etc. */
  heading1: { fontSize: 28, fontWeight: "800" } as TextStyle,
  /** Section headers inside a page */
  heading2: { fontSize: 22, fontWeight: "700" } as TextStyle,
  /** Card titles, sub-section headers */
  heading3: { fontSize: 18, fontWeight: "700" } as TextStyle,
  /** Standard body / description text */
  body: { fontSize: 15, fontWeight: "400" } as TextStyle,
  /** Emphasized body: prices in lists, bold descriptions */
  bodyBold: { fontSize: 15, fontWeight: "600" } as TextStyle,
  /** Timestamps, labels, secondary info */
  caption: { fontSize: 13, fontWeight: "400" } as TextStyle,
  /** Status badges, bold small labels */
  captionBold: { fontSize: 13, fontWeight: "600" } as TextStyle,
  /** Fine print, badge counts */
  small: { fontSize: 11, fontWeight: "400" } as TextStyle,
  /** Button labels */
  button: { fontSize: 16, fontWeight: "700" } as TextStyle,
  /** Text input fields */
  input: { fontSize: 15, fontWeight: "500" } as TextStyle,
  /** Product prices (prominent) */
  price: { fontSize: 18, fontWeight: "800" } as TextStyle,
  /** Brand / logo text */
  logo: { fontSize: 48, fontWeight: "900" } as TextStyle,
} as const;

