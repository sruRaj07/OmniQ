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
