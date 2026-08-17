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

// Zone ids arrive as a path parameter, so they are unvalidated strings until this runs. Without the
// uuid check a malformed id reaches Postgres and comes back as a raw cast error ("invalid input
// syntax for type uuid"), which is both a poor message and needless database work.
export const zoneIdSchema = z.string().uuid("Zone id must be a valid uuid.");
