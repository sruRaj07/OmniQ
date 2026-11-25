/**
 * OmniQ location service - request validators.
 * Author: OmniQ Team
 */
import { z } from "zod";

export const pincodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, "Pincode must be 6 digits and cannot start with 0");

export const zoneCheckSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  pincode: z.string().optional()
}).refine(data => data.pincode || (data.lat !== undefined && data.lng !== undefined), {
  message: "Either pincode or lat/lng must be provided"
});

export const calculateDeliverySchema = z.object({
  subtotal: z.number().nonnegative("Subtotal cannot be negative"),
  pincode: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  sellerId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional()
}).refine(data => data.pincode || (data.lat !== undefined && data.lng !== undefined), {
  message: "Either pincode or lat/lng must be provided to calculate delivery fee"
});

export const autocompleteQuerySchema = z.object({
  input: z.string().min(1, "Input is required").max(200),
  sessionToken: z.string().optional()
});

export const placeDetailsQuerySchema = z.object({
  placeId: z.string().min(1, "Place ID is required").max(200),
  sessionToken: z.string().optional()
});

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

