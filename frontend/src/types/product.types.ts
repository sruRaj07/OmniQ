/**
 * OmniQ mobile app - product domain types.
 * Author: OmniQ Team
 */
export type Product = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  compare_price?: number;
  images: string[];
  category: string;
  stock_quantity: number;
  // UI only fallback fields (we can add these on the frontend side for UI purposes)
  seller?: string;
  rating?: number;
  reviews?: number;
  badge?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  is_approved?: boolean;
  is_flagged?: boolean;
  is_active?: boolean;
  category_id?: string;
};
