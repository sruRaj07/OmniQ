/**
 * OmniQ mobile app - product image compression.
 *
 * Sellers upload straight from a phone camera, which on a Redmi-class device
 * means a 3-5MB JPEG. Buyers then pull that file over 2G. Compressing on the
 * seller's device is the cheapest place to fix it: one upload pays for every
 * download that follows.
 *
 * Three artefacts come out of a single decode:
 *   - full        1200px WebP q75  → the image shown on the product page
 *   - thumbnail    400px WebP q60  → what grids and cart rows load on 2G/3G
 *   - placeholder   20px WebP q40  → inlined base64, painted while the rest loads
 *
 * Author: OmniQ Team
 */
import { ImageManipulator, SaveFormat, type ImageRef } from "expo-image-manipulator";
import { File } from "expo-file-system";

/** Longest edge of the image kept for the product detail page. */
export const FULL_WIDTH = 1200;
export const FULL_QUALITY = 0.75;

/** Longest edge of the list/grid thumbnail. */
export const THUMBNAIL_WIDTH = 400;
export const THUMBNAIL_QUALITY = 0.6;

/** Inline placeholder. Tiny enough to ride along in the products row itself. */
export const PLACEHOLDER_WIDTH = 20;
export const PLACEHOLDER_QUALITY = 0.4;

/** Anything above this after compression is worth flagging to the developer. */
export const SIZE_WARN_BYTES = 500 * 1024;

export type CompressedImage = {
  /** Local `file://` URI of the compressed result, ready to upload. */
  uri: string;
  width: number;
  height: number;
  /** Size on disk in bytes. 0 when the platform cannot stat the file (web). */
  fileSize: number;
  /**
   * Base64 WebP data URI (~20px). Named `blurhash` to match the column and the
   * `NetworkAwareImage` prop; it is a data URI, not a BlurHash string.
   */
  blurhash: string | null;
};

export type CompressionResult = {
  full: CompressedImage;
  thumbnail: CompressedImage;
  /** Size of the seller's original file, for the "X% saved" readout. */
  originalSize: number;
};

/**
 * Reads a local file's size. Returns 0 rather than throwing — a missing stat
 * must never block an upload, it only degrades the savings readout.
 */
function fileSizeOf(uri: string): number {
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Encodes at `format`, falling back to JPEG if the platform cannot write WebP.
 * iOS gained WebP encoding late and web depends on the browser's canvas codec,
 * so a hard failure here would break uploads on those targets.
 */
async function save(
  image: ImageRef,
  compress: number,
  base64: boolean
): Promise<{ uri: string; width: number; height: number; base64?: string }> {
  try {
    return await image.saveAsync({ compress, format: SaveFormat.WEBP, base64 });
  } catch {
    console.warn("[OmniQ] WebP encoding unavailable — falling back to JPEG.");
    return await image.saveAsync({ compress, format: SaveFormat.JPEG, base64 });
  }
}

function toDataUri(base64: string | undefined): string | null {
  return base64 ? `data:image/webp;base64,${base64}` : null;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Percentage of the original bytes removed, clamped to 0-99. */
export function savingsPercent(originalSize: number, newSize: number): number {
  if (originalSize <= 0 || newSize <= 0) return 0;
  return Math.max(0, Math.min(99, Math.round((1 - newSize / originalSize) * 100)));
}

/**
 * Produces the 1200px upload image plus its inline placeholder.
 *
 * The context is reset between renders so both derive from the original pixels
 * rather than from the already-downscaled result.
 */
export async function compressProductImage(uri: string): Promise<CompressedImage> {
  const originalSize = fileSizeOf(uri);
  const context = ImageManipulator.manipulate(uri);

  const full = await save(
    await context.resize({ width: FULL_WIDTH }).renderAsync(),
    FULL_QUALITY,
    false
  );

  const placeholder = await save(
    await context.reset().resize({ width: PLACEHOLDER_WIDTH }).renderAsync(),
    PLACEHOLDER_QUALITY,
    true
  );

  const fileSize = fileSizeOf(full.uri);

  if (fileSize > SIZE_WARN_BYTES) {
    console.warn(
      `[OmniQ] Compressed image is still ${formatBytes(fileSize)} ` +
        `(over the ${formatBytes(SIZE_WARN_BYTES)} budget). Source: ${formatBytes(originalSize)}.`
    );
  } else if (originalSize > 0) {
    console.log(
      `[OmniQ] Image ${formatBytes(originalSize)} → ${formatBytes(fileSize)} ` +
        `(${savingsPercent(originalSize, fileSize)}% smaller)`
    );
  }

  return {
    uri: full.uri,
    width: full.width,
    height: full.height,
    fileSize,
    blurhash: toDataUri(placeholder.base64),
  };
}

/** Produces the 400px grid thumbnail. */
export async function compressProductThumbnail(uri: string): Promise<CompressedImage> {
  const context = ImageManipulator.manipulate(uri);
  const thumbnail = await save(
    await context.resize({ width: THUMBNAIL_WIDTH }).renderAsync(),
    THUMBNAIL_QUALITY,
    false
  );

  return {
    uri: thumbnail.uri,
    width: thumbnail.width,
    height: thumbnail.height,
    fileSize: fileSizeOf(thumbnail.uri),
    blurhash: null,
  };
}

export type ImageOptimization = {
  /** Human label for the encoding, e.g. "WebP". */
  format: string;
  /** True once the image went through `compressProductImage`. */
  isOptimized: boolean;
  /** Ready-to-render badge text for the seller product list. */
  label: string;
};

/**
 * Classifies an already-uploaded image from its URL.
 *
 * Byte size is deliberately not fetched: a HEAD request per row would undo the
 * bandwidth this whole change is meant to save. The extension is enough to tell
 * a seller which old listings are worth re-uploading.
 */
export function describeOptimization(url?: string | null): ImageOptimization | null {
  if (!url) return null;

  const extension = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";

  switch (extension) {
    case "webp":
      return { format: "WebP", isOptimized: true, label: "WebP · optimised" };
    case "png":
      return { format: "PNG", isOptimized: false, label: "PNG · re-upload to shrink" };
    case "jpg":
    case "jpeg":
      return { format: "JPEG", isOptimized: false, label: "JPEG · re-upload to shrink" };
    default:
      return null;
  }
}

/** Convenience wrapper returning everything the upload form needs for one pick. */
export async function compressForUpload(uri: string): Promise<CompressionResult> {
  const originalSize = fileSizeOf(uri);
  const [full, thumbnail] = await Promise.all([
    compressProductImage(uri),
    compressProductThumbnail(uri),
  ]);
  return { full, thumbnail, originalSize };
}
