/**
 * OmniQ admin service - request validators.
 * Author: OmniQ Team
 */
import { z } from "zod";

export const moderationSchema = z.object({
  action: z.enum(["approve", "hold", "remove", "delete"]),
  reason: z.string().optional()
});

export const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  centreLat: z.number(),
  centreLng: z.number(),
  radiusKm: z.number().positive(),
  pinCodes: z.array(z.string()).default([])
});
