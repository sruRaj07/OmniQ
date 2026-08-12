/**
* OmniQ product service - request validators.
* Author: OmniQ Team
*/
import { z } from "zod";

/** Normalize category: trim whitespace + capitalize first letter of each word */
function normalizeCategory(val: string): string {
  return val.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

export const productCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  compare_price: z.coerce.number().positive().optional(),
  images: z.array(z.string().url()).max(5, "You can upload a maximum of 5 images").default([]),
  category: z.string().min(2).transform(normalizeCategory),
  sku: z.string().min(3),
  stock: z.coerce.number().int().min(0),
  sellerId: z.string().uuid().optional()
});

export const productUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  price: z.coerce.number().positive().optional(),
  compare_price: z.coerce.number().positive().optional(),
  images: z.array(z.string().url()).max(5, "You can upload a maximum of 5 images").optional(),
  category: z.string().min(2).transform(normalizeCategory).optional(),
  stock: z.coerce.number().int().min(0).optional(),
});

export const productListQuerySchema = z.object({
  category: z.string().optional(),
  seller: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
