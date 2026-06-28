/**
 * OmniQ mobile app - order domain types.
 * Author: OmniQ Team
 */
export type OrderStatus = "pending" | "packed" | "dispatched" | "delivered" | "cancelled";

export type Order = {
  id: string;
  productTitle: string;
  buyer: string;
  seller: string;
  amount: number;
  status: OrderStatus;
  location: string;
  createdAt: string;
};
