/**
 * OmniQ mobile app - short relative timestamps.
 *
 * Sellers scan order lists for "how long has this been sitting there", so the list shows
 * "12m" / "3h" / "2d" rather than a full date. Anything older than a week falls back to a
 * date, because "23d" stops being useful.
 *
 * Author: OmniQ Team
 */

/** Compact form for list rows: `Just now`, `12m`, `3h`, `2d`, `14 Aug`. */
export function shortRelativeTime(value?: string | number | Date | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return "";

  const diffSeconds = Math.floor((Date.now() - time) / 1000);
  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Long form for detail views: `18 Aug 2026, 4:05 pm`. */
export function fullDateTime(value?: string | number | Date | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
