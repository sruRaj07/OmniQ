/**
 * OmniQ mobile app - seller portal design tokens.
 *
 * The seller portal is a working tool, not a storefront: a seller opens it to answer
 * "what needs my attention right now?". These tokens keep every seller screen on one
 * rhythm (spacing, corner radius, elevation) and give status a single colour language
 * so a glance at any screen reads the same way.
 *
 * Author: OmniQ Team
 */
import { Platform, type ViewStyle } from "react-native";

/** 4pt spacing scale. Use these instead of ad-hoc numbers so screens line up vertically. */
export const SPACE = Object.freeze({
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
});

/** Corner radii. `pill` is for chips and badges, `lg` is the standard card. */
export const RADIUS = Object.freeze({
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
});

/**
 * ⚡ PERFORMANCE: shadows are resolved once at module load and frozen, so no screen pays
 * a Platform.select on every render. Android gets `elevation` rather than a JS-composited
 * shadow — on a 2GB Redmi Note class device an elevation is a native draw call, while
 * shadowOffset/shadowRadius force an expensive software layer.
 */
const makeShadow = (elevation: number, opacity: number, blur: number, offsetY: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    ios: {
      shadowColor: "#1B1A17",
      shadowOpacity: opacity,
      shadowRadius: blur,
      shadowOffset: { width: 0, height: offsetY },
    },
    default: { boxShadow: `0px ${offsetY}px ${blur * 2}px rgba(27,26,23,${opacity})` } as ViewStyle,
  }) as ViewStyle;

export const SHADOW = Object.freeze({
  none: Object.freeze({} as ViewStyle),
  /** Resting cards in a list. */
  sm: Object.freeze(makeShadow(1, 0.06, 3, 1)),
  /** Cards that carry a primary number or action. */
  md: Object.freeze(makeShadow(3, 0.09, 6, 3)),
  /** Sheets, floating buttons, anything that sits above the page. */
  lg: Object.freeze(makeShadow(8, 0.14, 12, 6)),
});

/** Blue used for the "in transit" state. Not a brand colour, so it lives here rather than in the theme. */
export const TRANSIT_BLUE = "#0284C7";

/** `#RRGGBB` -> `rgba(...)`. Used for the 8-14% tints behind status chips. */
export function withAlpha(hex: string, alpha: number): string {
  if (typeof hex !== "string" || !hex.startsWith("#")) return hex;
  const clean = hex.slice(1);
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return hex;
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export type SellerOrderStatus = "pending" | "packed" | "dispatched" | "delivered" | "cancelled";

/** The happy path a seller walks an order through. `cancelled` is deliberately outside it. */
export const ORDER_FLOW: readonly SellerOrderStatus[] = ["pending", "packed", "dispatched", "delivered"];

export type StatusMeta = {
  key: string;
  /** Written for the seller, not the buyer: "New order", not "On the way". */
  label: string;
  color: string;
  tint: string;
  hint: string;
};

export function orderStatusMeta(status: string | undefined | null, colors: any): StatusMeta {
  switch (String(status ?? "pending").toLowerCase()) {
    case "packed":
      return {
        key: "packed",
        label: "Packed",
        color: colors.accent,
        tint: withAlpha(colors.accent, 0.12),
        hint: "Ready for pickup",
      };
    case "dispatched":
      return {
        key: "dispatched",
        label: "Out for delivery",
        color: TRANSIT_BLUE,
        tint: withAlpha(TRANSIT_BLUE, 0.12),
        hint: "On the way to the buyer",
      };
    case "delivered":
      return {
        key: "delivered",
        label: "Delivered",
        color: colors.success,
        tint: withAlpha(colors.success, 0.12),
        hint: "Completed",
      };
    case "cancelled":
      return {
        key: "cancelled",
        label: "Cancelled",
        color: colors.danger,
        tint: withAlpha(colors.danger, 0.12),
        hint: "This order was cancelled",
      };
    default:
      return {
        key: "pending",
        label: "New order",
        color: colors.warning,
        tint: withAlpha(colors.warning, 0.14),
        hint: "Needs packing",
      };
  }
}

/**
 * The single next thing a seller can do to an order, or null when the order is finished.
 * Every status button in the portal comes from here, so the wording can never drift
 * between the order card and the detail sheet.
 */
export function nextOrderStep(status: string | undefined | null): { status: SellerOrderStatus; label: string } | null {
  switch (String(status ?? "pending").toLowerCase()) {
    case "pending":
      return { status: "packed", label: "Mark as packed" };
    case "packed":
      return { status: "dispatched", label: "Hand to delivery" };
    case "dispatched":
      return { status: "delivered", label: "Mark as delivered" };
    default:
      return null;
  }
}

/**
 * Approval state of a listing.
 *
 * The `products` table has `is_approved` / `is_flagged` / `stock` and no `is_active` or
 * `stock_quantity` column, so every listing check in the portal funnels through here
 * rather than guessing at a field name per screen.
 */
export function productStatusMeta(product: any, colors: any): StatusMeta {
  if (product?.is_flagged) {
    return {
      key: "rejected",
      label: "Rejected",
      color: colors.danger,
      tint: withAlpha(colors.danger, 0.12),
      hint: product?.flag_reason || "Edit and resubmit for approval",
    };
  }
  if (product?.is_approved) {
    return {
      key: "live",
      label: "Live",
      color: colors.success,
      tint: withAlpha(colors.success, 0.12),
      hint: "Buyers can see this listing",
    };
  }
  return {
    key: "review",
    label: "In review",
    color: colors.warning,
    tint: withAlpha(colors.warning, 0.14),
    hint: "Usually approved within 24 hours",
  };
}

/** Stock lives in `stock`; `stock_quantity` is only ever present on mocked data. */
export function stockOf(product: any): number {
  const raw = product?.stock ?? product?.stock_quantity;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Below this a listing is worth flagging to the seller before it sells out. */
export const LOW_STOCK_THRESHOLD = 5;
