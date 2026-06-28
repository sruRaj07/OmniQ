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
};

export async function listProducts(): Promise<ProductDto[]> {
  const { data, error } = await supabase.from("products").select("*");
  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
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

export async function createProduct(input: unknown): Promise<ProductDto> {
  const parsed = productCreateSchema.parse(input);
  const product = { 
    id: parsed.sku.toLowerCase(), 
    title: parsed.title, 
    description: parsed.description,
    price: parsed.price, 
    category: parsed.category, 
    stock: parsed.stock,
    images: parsed.images
  };
  
  const { data, error } = await supabase.from("products").insert([product]).select().single();
  if (error) throw new Error(`Failed to create product: ${error.message}`);
  return data;
}
