/**
 * OmniQ location service - request validators.
 * Author: OmniQ Team
 */
import { z } from "zod";

export const zoneCheckSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  pincode: z.string().optional()
}).refine(data => data.pincode || (data.lat !== undefined && data.lng !== undefined), {
  message: "Either pincode or lat/lng must be provided"
});
