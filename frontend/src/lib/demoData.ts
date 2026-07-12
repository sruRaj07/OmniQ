import { Product } from "@/types/product.types";

// Temporary fallback for mock data if backend is unreachable
// Remove this once we rely entirely on backend logic

export const products: Product[] = [
  {
    id: "air-boost",
    title: "Air Boost Pro Sneakers",
    seller: "SportZone India",
    price: 1999,
    compare_price: 3299,
    images: ["👟"],
    category: "Fashion",
    rating: 4.8,
    reviews: 284,
    badge: "-40%"
  },
  {
    id: "buds-x3",
    title: "Smart Buds X3 Pro",
    seller: "TechHub Store",
    price: 2499,
    compare_price: 3999,
    images: ["📱"],
    category: "Tech",
    rating: 4.7,
    reviews: 512,
    badge: "New"
  },
  {
    id: "gold-necklace",
    title: "Gold Plated Necklace",
    seller: "Gehna Jewels",
    price: 899,
    images: ["💍"],
    category: "Beauty",
    rating: 4.8,
    reviews: 143
  }
] as unknown as Product[];

export const cartItems = [
  { product: products[0], size: "7", color: "White", quantity: 1 },
  { product: products[1], color: "Black", quantity: 1 },
  { product: products[2], quantity: 2 }
] as const;

export const categories = [
  { id: "fashion", name: "Fashion", icon: "👕" },
  { id: "tech", name: "Tech", icon: "💻" },
  { id: "beauty", name: "Beauty", icon: "✨" },
  { id: "home", name: "Home", icon: "🏠" },
  { id: "grocery", name: "Grocery", icon: "🍎" }
] as const;
