/**
 * OmniQ product service - product business logic.
 * Author: OmniQ Team
 */
import { productCreateSchema } from "../validators/productValidator";
import { supabase } from "../../../../shared/utils/supabaseClient";

export type ProductDto = {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  images?: string[];
  is_approved?: boolean;
  is_flagged?: boolean;
};

export async function listProducts(sellerId?: string): Promise<ProductDto[]> {
  let query = supabase.from("products").select("*");
  
  if (sellerId) {
    query = query.eq("seller_id", sellerId);
  } else {
    // Public fetch: only show approved products
    query = query.eq("is_approved", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  return data || [];
}

export async function listSellerProducts(ownerId: string): Promise<ProductDto[]> {
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
  return data || [];
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
    category: parsed.category, 
    stock: parsed.stock,
    images: parsed.images,
    is_approved: false
  };
  
  const { data, error } = await supabase.from("products").insert([product]).select().single();
  if (error) throw new Error(`Failed to create product: ${error.message}`);
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

  // Full-text search on title and description using ilike
  if (q && q.trim().length > 0) {
    const searchTerm = `%${q.trim()}%`;
    query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
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
