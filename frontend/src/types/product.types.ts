/**
 * OmniQ mobile app - product domain types.
 * Author: OmniQ Team
 */
export type Product = {
  id: string;
  title: string;
  seller: string;
  price: number;
  comparePrice?: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  badge?: string;
};
