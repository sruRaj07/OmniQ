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
  city: z.string().min(2),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  assignedWarehouseId: z.string().uuid().optional()
});

export const sellerStatusSchema = z.object({
  status: z.enum(["pending", "approved", "suspended", "rejected"]),
  rejectionReason: z.string().optional(),
  assignedWarehouseId: z.string().uuid().optional()
});

export const sellerUpdateProfileSchema = z.object({
  description: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  assignedWarehouseId: z.string().uuid().optional()
});

export const sellerAssignWarehouseSchema = z.object({
  warehouseId: z.string().uuid()
});

