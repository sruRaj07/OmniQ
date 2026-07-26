/**
 * OmniQ product service - product business logic.
 * Author: OmniQ Team
 */
import { productCreateSchema, productUpdateSchema } from "../validators/productValidator";
import { supabase } from "../../../../shared/utils/supabaseClient";
import { redis } from "./redisClient";

async function invalidateProductCaches(sellerId: string) {
  try {
    const keys = await redis.keys('products:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error("Failed to invalidate product caches:", err);
  }
}

export type ProductDto = {
  id: string;
  title: string;
  description?: string;
  price: number;
  compare_price?: number;
  category: string;
  stock: number;
  images?: string[];
  is_approved?: boolean;
  is_flagged?: boolean;
};

export async function listProducts(sellerId?: string, cursor?: string, limit: number = 100): Promise<{ products: ProductDto[], nextCursor: string | null }> {
  const cacheKey = `products:seller:${sellerId || 'all'}:cursor:${cursor || 'first'}:limit:${limit}`;
  if (!sellerId) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  let query = supabase.from("products").select("id, title, price, compare_price, images, seller_id, stock, category, created_at, is_approved, is_flagged");
  
  if (sellerId) {
    query = query.eq("seller_id", sellerId);
  } else {
    // Public fetch: only show approved products
    query = query.eq("is_approved", true);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  query = query.order("created_at", { ascending: false }).limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  
  const products = data || [];
  let nextCursor = null;
  if (products.length === limit && products.length > 0) {
    nextCursor = products[products.length - 1].created_at;
  }

  const result = { products, nextCursor };
  if (!sellerId) {
    await redis.setex(cacheKey, 300, JSON.stringify(result)); // TTL 5 minutes
  }
  return result;
}

export async function listSellerProducts(ownerId: string): Promise<ProductDto[]> {
  const cacheKey = `products:owner:${ownerId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (sellerError) throw new Error(`Failed to verify seller profile: ${sellerError.message}`);
  if (!seller) return []; // If no seller profile, they have no products

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch seller products: ${error.message}`);
  const result = data || [];
  await redis.setex(cacheKey, 600, JSON.stringify(result)); // TTL 10 minutes
  return result;
}

export async function getProduct(id: string): Promise<ProductDto | undefined> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return undefined; // Not found
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
  return data;
}

export async function createProduct(input: unknown, authUserId?: string): Promise<ProductDto> {
  const parsed = productCreateSchema.parse(input);
  
  let sellerId = parsed.sellerId;
  
  if (!sellerId && authUserId) {
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("owner_id", authUserId)
      .maybeSingle();
      
    if (sellerError) throw new Error(`Failed to verify seller profile: ${sellerError.message}`);
    if (!seller) throw new Error("Authenticated user does not have a registered seller profile.");
    sellerId = seller.id;
  }
  
  if (!sellerId) {
    throw new Error("A seller ID must be provided or resolved from authorization context.");
  }

  const product = { 
    id: parsed.sku.toLowerCase(), 
    seller_id: sellerId,
    title: parsed.title, 
    description: parsed.description,
    price: parsed.price, 
    compare_price: parsed.compare_price,
    category: parsed.category, 
    stock: parsed.stock,
    images: parsed.images,
    is_approved: false
  };
  
  const { data, error } = await supabase.from("products").insert([product]).select().single();
  if (error) throw new Error(`Failed to create product: ${error.message}`);
  
  await invalidateProductCaches(sellerId);
  return data;
}

export async function updateProduct(id: string, input: unknown, authUserId: string): Promise<ProductDto> {
  const parsed = productUpdateSchema.parse(input);
  
  // Verify ownership
  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_id", authUserId)
    .maybeSingle();
    
  if (sellerError || !seller) throw new Error("Authenticated user does not have a registered seller profile.");
  
  // Verify product belongs to seller
  const { data: existing, error: existingError } = await supabase.from("products").select("seller_id").eq("id", id).single();
  if (existingError || !existing) throw new Error("Product not found");
  if (existing.seller_id !== seller.id) throw new Error("Unauthorized to edit this product");

  const updates: any = {
    is_approved: false, // Force re-approval
    is_flagged: false,
    updated_at: new Date().toISOString()
  };
  
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.price !== undefined) updates.price = parsed.price;
  if (parsed.compare_price !== undefined) updates.compare_price = parsed.compare_price;
  if (parsed.category !== undefined) updates.category = parsed.category;
  if (parsed.stock !== undefined) updates.stock = parsed.stock;
  if (parsed.images !== undefined) updates.images = parsed.images;

  const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update product: ${error.message}`);
  
  await invalidateProductCaches(seller.id);
  return data;
}

export type SearchParams = {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  limit?: number;
  offset?: number;
  suggestions?: boolean;
};

export async function searchProducts(params: SearchParams): Promise<{ products: ProductDto[]; total: number; suggestions?: string[] }> {
  const { q, category, minPrice, maxPrice, sort = "relevance", limit = 20, offset = 0, suggestions = false } = params;

  // Build the query — only return approved products
  let query = supabase.from("products").select("*", { count: "exact" }).eq("is_approved", true);

  // Full-text search on title, description, and category using ilike (sanitized for PostgREST reserved chars)
  if (q && q.trim().length > 0) {
    const sanitizedQ = q.trim().replace(/[^a-zA-Z0-9\s]+/g, "%").replace(/%+/g, "%");
    const searchTerm = `%${sanitizedQ}%`;
    query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`);
  }

  // Category filter
  if (category && category.trim().length > 0) {
    query = query.ilike("category", category.trim());
  }

  // Price range filters
  if (minPrice !== undefined && minPrice >= 0) {
    query = query.gte("price", minPrice);
  }
  if (maxPrice !== undefined && maxPrice > 0) {
    query = query.lte("price", maxPrice);
  }

  // Sorting
  switch (sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      // "relevance" — newest first as a sensible default
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Search failed: ${error.message}`);

  const products = data || [];
  const total = count ?? products.length;

  // If suggestions mode, extract unique title prefixes for auto-complete
  if (suggestions && q) {
    const seen = new Set<string>();
    const suggestionList: string[] = [];
    for (const p of products) {
      const title = p.title?.toLowerCase();
      if (title && !seen.has(title)) {
        seen.add(title);
        suggestionList.push(p.title);
        if (suggestionList.length >= 5) break;
      }
    }
    return { products, total, suggestions: suggestionList };
  }

  return { products, total };
}

export async function getCategoryTags(): Promise<string[]> {
  // Configured dynamic tag pills served to frontend product listing form.
  // Currently restricted to 'grocery' and 'kitchen' per current active business strategy.
  // In the future, this array (or database table) can be expanded to dynamically add new tags without any frontend app changes!
  const activeTags = ["grocery", "kitchen"];
  return activeTags;
}
