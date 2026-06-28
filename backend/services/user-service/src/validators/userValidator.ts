/**
 * OmniQ user service - request validators.
 * Author: OmniQ Team
 */
import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phoneNumber: z.string().min(8).optional(),
  address: z.string().min(5).optional(),
  pincode: z.string().min(4).optional()
});

export const roleAssignmentSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["buyer", "seller", "admin"])
});
