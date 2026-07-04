/**
 * OmniQ product service - request validators.
 * Author: OmniQ Team
 */
import { z } from "zod";

export const productCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  comparePrice: z.coerce.number().positive().optional(),
  images: z.array(z.string().url()).max(5, "You can upload a maximum of 5 images").default([]),
  category: z.string().min(2),
  sku: z.string().min(3),
  stock: z.coerce.number().int().min(0),
  sellerId: z.string().uuid().optional()
});

export const productListQuerySchema = z.object({
  category: z.string().optional(),
  seller: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
