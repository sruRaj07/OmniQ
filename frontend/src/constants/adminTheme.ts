/**
 * OmniQ mobile app - design tokens and status logic for the admin console.
 *
 * Spacing, radii, shadows and withAlpha are shared with the seller portal rather than duplicated:
 * they are generic primitives, and a second copy would cost APK size against a 40MB ceiling for no
 * design benefit. Everything below is admin-specific.
 *
 * Author: OmniQ Team
 */
import { RADIUS, SHADOW, SPACE, withAlpha } from "./sellerTheme";

export { RADIUS, SHADOW, SPACE, withAlpha };

export type AdminStatusMeta = {
  label: string;
  color: string;
  tint: string;
};

/** Seller approval state, rendered identically everywhere it appears. */
export function sellerStatusMeta(status: string | undefined | null, colors: any): AdminStatusMeta {
  switch (String(status ?? "").toLowerCase()) {
    case "approved":
    case "active":
      return { label: "Approved", color: colors.success, tint: withAlpha(colors.success, 0.12) };
    case "pending":
      return { label: "Pending review", color: colors.warning, tint: withAlpha(colors.warning, 0.14) };
    case "suspended":
      return { label: "Suspended", color: colors.danger, tint: withAlpha(colors.danger, 0.12) };
    case "rejected":
      return { label: "Rejected", color: colors.danger, tint: withAlpha(colors.danger, 0.12) };
    default:
      return { label: status ? String(status) : "Unknown", color: colors.textMuted, tint: colors.bgTertiary };
  }
}

/** Order lifecycle state. Mirrors the seller portal's vocabulary so the two consoles agree. */
export function adminOrderStatusMeta(status: string | undefined | null, colors: any): AdminStatusMeta {
  switch (String(status ?? "").toLowerCase()) {
    case "delivered":
      return { label: "Delivered", color: colors.success, tint: withAlpha(colors.success, 0.12) };
    case "dispatched":
      return { label: "Dispatched", color: "#0284C7", tint: withAlpha("#0284C7", 0.12) };
    case "packed":
      return { label: "Packed", color: colors.accent, tint: withAlpha(colors.accent, 0.12) };
    case "cancelled":
      return { label: "Cancelled", color: colors.danger, tint: withAlpha(colors.danger, 0.12) };
    case "pending":
      return { label: "Pending", color: colors.warning, tint: withAlpha(colors.warning, 0.14) };
    default:
      return { label: status ? String(status) : "Unknown", color: colors.textMuted, tint: colors.bgTertiary };
  }
}

/**
 * Compact Indian-numbering money for KPI tiles. ₹12,45,000 is accurate but unreadable at a glance
 * on a 360dp screen, so large values collapse to lakh/crore - the units an Indian operator
 * actually thinks in. The exact figure stays available in the order list.
 */
export function compactInr(value: number): string {
  const amount = Number(value) || 0;
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(abs >= 100_000_000 ? 0 : 2)}Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(abs >= 1_000_000 ? 0 : 2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

/** Whole-number counts with Indian grouping. */
export function compactCount(value: number): string {
  return (Number(value) || 0).toLocaleString("en-IN");
}
