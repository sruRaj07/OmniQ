/**
 * OmniQ shared package - minimal Supabase table shapes.
 * Author: OmniQ Team
 */
export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "buyer" | "seller" | "admin";
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  compare_price: number | null;
  images: string[];
  category: string;
  sku: string;
  stock: number;
  is_active: boolean;
  is_flagged: boolean;
};
