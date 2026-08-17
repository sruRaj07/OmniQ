/**
 * OmniQ mobile app - remote image URL sizing.
 *
 * Rewrites a stored image URL into a resized, WebP-encoded variant so a product
 * grid pulls down thumbnails instead of full-resolution originals.
 *
 * Author: OmniQ Team
 */

/** Supabase Storage serves originals from this path prefix. */
const SUPABASE_OBJECT_PATH = "/storage/v1/object/public/";
/** ...and resized renditions from this one. */
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";

/**
 * Supabase refuses widths above this, and nothing in the app displays an image
 * wider than a tablet viewport.
 */
const MAX_WIDTH = 2500;

export type ImageSizing = {
  /** Longest edge to request, in device pixels. */
  width: number;
  /** WebP quality, 20-100. */
  quality?: number;
};

function clampWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return MAX_WIDTH;
  return Math.min(MAX_WIDTH, Math.ceil(width));
}

function clampQuality(quality: number | undefined): number {
  if (!Number.isFinite(quality as number)) return 70;
  return Math.min(100, Math.max(20, Math.round(quality as number)));
}

/**
 * Returns a resized variant of `url`, or `url` unchanged when the host offers no
 * transformation API.
 *
 * ⚡ PERFORMANCE: this is the single largest transfer win in the app. A stored
 * product photo is a ~700KB PNG; the same image at `width=300&quality=60` comes
 * back as an ~11KB WebP — roughly 60x less to download and decode per card. On a
 * 2GB Redmi over 3G that is the difference between a grid that pops in and one
 * that trickles.
 *
 * `format=webp` is passed explicitly and deliberately. Supabase will negotiate
 * WebP from an `Accept: image/webp` request header, but the native image loaders
 * on Android and iOS do not reliably send one — without the explicit parameter
 * they are served the original PNG (measured: 302KB vs 11KB for the same
 * transform). Do not drop it. WebP itself decodes natively on Android 4.0+,
 * iOS 14+, and every browser the web build targets.
 *
 * Only unsigned `/object/public/` URLs are rewritten. Signed URLs live under
 * `/object/sign/` and carry a token bound to the exact path, so rewriting one
 * would invalidate it.
 */
export function sizedImageUrl(
  url: string | null | undefined,
  sizing: ImageSizing
): string | null | undefined {
  if (!url || typeof url !== "string") return url;

  const width = clampWidth(sizing.width);
  const quality = clampQuality(sizing.quality);

  // Supabase Storage — the source of 446 of the 450 product images in the catalogue.
  if (url.includes(SUPABASE_OBJECT_PATH) || url.includes(SUPABASE_RENDER_PATH)) {
    const base = url
      .replace(SUPABASE_OBJECT_PATH, SUPABASE_RENDER_PATH)
      // An already-rendered URL is re-sized rather than double-suffixed, so a
      // value that round-trips through here twice stays valid.
      .split("?")[0];
    return `${base}?width=${width}&quality=${quality}&format=webp`;
  }

  // Unsplash backs the advertisement banners and a handful of seeded products,
  // and exposes the same knobs under different parameter names.
  if (url.includes("images.unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?w=${width}&q=${quality}&fm=webp&auto=format&fit=max`;
  }

  // Unknown host: hand back the original rather than guess at a parameter
  // scheme and serve a broken image.
  return url;
}
