/**
 * OmniQ seller service - request validators.
 * Author: OmniQ Team
 */
import { z } from "zod";

export const sellerRegistrationSchema = z.object({
  businessName: z.string().min(2),
  description: z.string().optional(),
  gstNumber: z.string().min(10),
  category: z.string().min(2),
  city: z.string().min(2)
});

export const sellerStatusSchema = z.object({
  status: z.enum(["pending", "approved", "suspended", "rejected"]),
  rejectionReason: z.string().optional()
});

export const sellerUpdateProfileSchema = z.object({
  description: z.string().optional()
});
