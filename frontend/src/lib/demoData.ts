/**
 * OmniQ mobile app - demo commerce data for offline-first screens.
 * Author: OmniQ Team
 */
import type { Order } from "@/types/order.types";
import type { Product } from "@/types/product.types";

export const products: Product[] = [
  {
    id: "air-boost",
    title: "Air Boost Pro Sneakers",
    seller: "SportZone India",
    price: 1999,
    comparePrice: 3299,
    image: "👟",
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
    comparePrice: 3999,
    image: "📱",
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
    image: "💍",
    category: "Beauty",
    rating: 4.8,
    reviews: 143
  }
];

export const cartItems = [
  { product: products[0], size: "7", color: "White", quantity: 1 },
  { product: products[1], color: "Black", quantity: 1 },
  { product: products[2], quantity: 2 }
] as const;

export const sellerOrders = [
  { id: "#OMQ-2847", buyer: "Rahul Sharma", items: "2 items", amount: 2499, status: "Pending", icon: "📦" },
  { id: "#OMQ-2846", buyer: "Priya Singh", items: "1 item", amount: 1999, status: "Packed", icon: "📬" },
  { id: "#OMQ-2845", buyer: "Amit Kumar", items: "3 items", amount: 4297, status: "Dispatched", icon: "🚚" }
] as const;

export const adminOrders: Order[] = [
  {
    id: "#OMQ-2847",
    productTitle: "Air Boost Pro Sneakers",
    buyer: "Rahul Sharma",
    seller: "SportZone India",
    amount: 1999,
    status: "pending",
    location: "Koramangala, Bengaluru",
    createdAt: "Today, 9:32 AM"
  },
  {
    id: "#OMQ-2846",
    productTitle: "Smart Buds X3 Pro",
    buyer: "Priya Singh",
    seller: "TechHub Store",
    amount: 2499,
    status: "packed",
    location: "Indiranagar, Bengaluru",
    createdAt: "Today, 8:14 AM"
  },
  {
    id: "#OMQ-2845",
    productTitle: "Gold Plated Necklace x2",
    buyer: "Amit Kumar",
    seller: "Gehna Jewels",
    amount: 1798,
    status: "delivered",
    location: "HSR Layout, Bengaluru",
    createdAt: "Yesterday, 6:50 PM"
  }
];

export const sellers = [
  {
    id: "freshmart",
    name: "FreshMart Organics",
    email: "freshmart@gmail.com",
    gst: "27ABCDE1234F1Z5",
    status: "Pending",
    detail: "Applied 2h ago",
    city: "Bengaluru",
    category: "Groceries & Organic",
    avatar: "F"
  },
  {
    id: "sportzone",
    name: "SportZone India",
    email: "sportzone@omniq.in",
    gst: "",
    status: "Active",
    detail: "Orders 248  Rating 4.9★",
    city: "Bengaluru",
    category: "Sports",
    avatar: "S"
  },
  {
    id: "badami",
    name: "Badami Traders",
    email: "badami@gmail.com",
    gst: "",
    status: "Suspended",
    detail: "Reason: Policy violation",
    city: "Mysuru",
    category: "General",
    avatar: "B"
  }
] as const;
