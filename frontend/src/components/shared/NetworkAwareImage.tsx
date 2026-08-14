/**
 * OmniQ mobile app - network-aware product image.
 *
 * Picks the cheapest acceptable source for the current connection and shows a
 * base64 micro-thumbnail placeholder while the full image decodes.
 *
 * Author: OmniQ Team
 */
import React, { useMemo } from "react";
import { Image, type ImageProps, type ImageSource } from "expo-image";
import { useNetworkQuality, type NetworkQuality } from "@/hooks/useNetworkQuality";

/** Longest edge we are willing to pull down on each tier, in px. */
export const WIDTH_BUDGET: Record<NetworkQuality, number> = {
  offline: 120,
  "2g": 120,
  "3g": 300,
  "4g": 600,
  wifi: 600,
};

export type NetworkAwareImageProps = Omit<ImageProps, "source" | "placeholder"> & {
  /** Full-resolution image URL, typically `product.images[0]`. */
  source?: string | ImageSource | null;
  /**
   * Compressed thumbnail URL (`product.thumbnail_url`). Preferred on slow
   * connections. Falls back to `source` when absent.
   */
  thumbnailSource?: string | null;
  /**
   * Base64 micro-thumbnail (~20px WebP data URI) produced by
   * `compressProductImage`, shown while the real image loads.
   */
  placeholder?: string | null;
};

function toSource(value: string | ImageSource | null | undefined): ImageSource | null {
  if (!value) return null;
  return typeof value === "string" ? { uri: value } : value;
}

/**
 * Chooses between the thumbnail and the full image for a given tier.
 * Exported for testing.
 */
export function pickSource(
  quality: NetworkQuality,
  full: string | ImageSource | null | undefined,
  thumbnail: string | null | undefined
): ImageSource | null {
  const preferThumbnail =
    quality === "offline" || quality === "2g" || quality === "3g";

  if (preferThumbnail && thumbnail) return { uri: thumbnail };
  return toSource(full);
}

export function NetworkAwareImage({
  source,
  thumbnailSource,
  placeholder,
  transition = 300,
  cachePolicy = "memory-disk",
  contentFit = "cover",
  ...rest
}: NetworkAwareImageProps) {
  const quality = useNetworkQuality();

  const resolvedSource = useMemo(
    () => pickSource(quality, source, thumbnailSource),
    [quality, source, thumbnailSource]
  );

  const resolvedPlaceholder = useMemo(
    () => (placeholder ? { uri: placeholder } : undefined),
    [placeholder]
  );

  // ⚡ PERFORMANCE: recyclingKey lets expo-image drop the previous bitmap when a
  // recycled FlashList cell rebinds, instead of holding both in memory. This
  // matters on 2GB devices scrolling long product grids.
  const recyclingKey = useMemo(
    () => (resolvedSource && "uri" in resolvedSource ? resolvedSource.uri : undefined),
    [resolvedSource]
  );

  return (
    <Image
      {...rest}
      source={resolvedSource}
      placeholder={resolvedPlaceholder}
      placeholderContentFit={contentFit}
      recyclingKey={recyclingKey}
      cachePolicy={cachePolicy}
      transition={transition}
      contentFit={contentFit}
      // Downsamples to the view's own size rather than decoding at full
      // resolution — the single biggest memory win on low-end Android.
      allowDownscaling
    />
  );
}
