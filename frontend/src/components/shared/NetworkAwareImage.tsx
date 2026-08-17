/**
 * OmniQ mobile app - network-aware product image.
 *
 * Picks the cheapest acceptable source for the current connection and shows a
 * base64 micro-thumbnail placeholder while the full image decodes.
 *
 * Author: OmniQ Team
 */
import React, { useMemo } from "react";
import { PixelRatio } from "react-native";
import { Image, type ImageProps, type ImageSource } from "expo-image";
import { useNetworkQuality, type NetworkQuality } from "@/hooks/useNetworkQuality";
import { sizedImageUrl } from "@/utils/imageUrl";

/** Longest edge we are willing to pull down on each tier, in px. */
export const WIDTH_BUDGET: Record<NetworkQuality, number> = {
  offline: 120,
  "2g": 120,
  "3g": 300,
  "4g": 600,
  wifi: 600,
};

/**
 * WebP quality per tier. Below ~45 the compression artefacts start showing on
 * product photography, so the slow tiers save bytes through size rather than by
 * degrading further.
 */
const QUALITY_BUDGET: Record<NetworkQuality, number> = {
  offline: 45,
  "2g": 45,
  "3g": 55,
  "4g": 70,
  wifi: 75,
};

/**
 * A 3x screen is the most we will honour. Beyond that the extra pixels are past
 * the point of visible return and only cost transfer and decode memory, which is
 * exactly what the 2GB target device has least of.
 */
const MAX_PIXEL_RATIO = 3;

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
  /**
   * Width this image actually occupies on screen, in dp. Used to request a
   * right-sized rendition instead of the tier's full budget — a 60dp order
   * thumbnail has no use for a 600px download. Omit for full-bleed images.
   */
  displayWidth?: number;
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

/**
 * Resolves the pixel width to request for a given tier and on-screen size.
 * Exported for testing.
 */
export function resolveWidth(
  quality: NetworkQuality,
  displayWidth: number | undefined
): number {
  const budget = WIDTH_BUDGET[quality];
  if (!displayWidth || !Number.isFinite(displayWidth) || displayWidth <= 0) {
    return budget;
  }
  const density = Math.min(PixelRatio.get() || 1, MAX_PIXEL_RATIO);
  // The tier budget is a ceiling, not a target: a small thumbnail stays small
  // even on wifi, but nothing exceeds what the connection can afford.
  return Math.min(budget, Math.ceil(displayWidth * density));
}

export function NetworkAwareImage({
  source,
  thumbnailSource,
  placeholder,
  displayWidth,
  transition = 300,
  cachePolicy = "memory-disk",
  contentFit = "cover",
  ...rest
}: NetworkAwareImageProps) {
  const quality = useNetworkQuality();

  // ⚡ PERFORMANCE: the tier budget above used to be inert — `thumbnail_url` is
  // null on every product in the catalogue, so `pickSource` always fell through
  // to the full-resolution original and a grid of 10 cards pulled ~7MB of PNG.
  // Rewriting the URL to a sized WebP rendition makes the budget real without
  // needing a stored thumbnail, and keeps working if one is added later.
  const resolvedSource = useMemo(() => {
    const picked = pickSource(quality, source, thumbnailSource);
    if (!picked || !("uri" in picked) || !picked.uri) return picked;
    const uri = sizedImageUrl(picked.uri, {
      width: resolveWidth(quality, displayWidth),
      quality: QUALITY_BUDGET[quality],
    });
    return uri === picked.uri ? picked : { ...picked, uri: uri as string };
  }, [quality, source, thumbnailSource, displayWidth]);

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
