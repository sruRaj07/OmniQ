/**
 * OmniQ mobile app - seller domain types.
 * Author: OmniQ Team
 */
export type SellerStatus = "pending" | "approved" | "suspended" | "rejected";

export type AssignedWarehouse = {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  supported_pincodes?: string[];
};

export type Seller = {
  id: string;
  businessName: string;
  city: string;
  category: string;
  rating: number;
  status: SellerStatus;
  lat?: number;
  lng?: number;
  assigned_warehouse_id?: string;
  assigned_warehouse?: AssignedWarehouse;
};

