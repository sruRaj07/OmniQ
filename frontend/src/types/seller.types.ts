/**
 * OmniQ mobile app - seller domain types.
 * Author: OmniQ Team
 */
export type SellerStatus = "pending" | "approved" | "suspended" | "rejected";

export type Seller = {
  id: string;
  businessName: string;
  city: string;
  category: string;
  rating: number;
  status: SellerStatus;
};
