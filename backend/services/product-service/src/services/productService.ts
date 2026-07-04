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
