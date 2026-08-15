/**
 * OmniQ seller service - seller business logic.
 * Author: OmniQ Team
 */
import { sellerRegistrationSchema, sellerStatusSchema, sellerUpdateProfileSchema } from "../validators/sellerValidator";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

export async function registerSeller(ownerId: string, input: unknown) {
  const parsed = sellerRegistrationSchema.parse(input);
  
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .insert({
      owner_id: ownerId,
      business_name: parsed.businessName,
      description: parsed.description,
      gst_number: parsed.gstNumber,
      category: parsed.category,
      city: parsed.city,
      status: "pending"
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to register seller: ${error.message}`);
  return data;
}

export async function listSellers() {
  const { data, error } = await supabaseAdmin.from("sellers").select("*");
  if (error) throw new Error(`Failed to fetch sellers: ${error.message}`);
  return data;
}

export async function getSellerById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch seller: ${error.message}`);
  return data;
}

export async function getSellerByOwnerId(ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .eq("owner_id", ownerId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch seller profile: ${error.message}`);
  }
  return data;
}

export async function updateSellerStatus(id: string, input: unknown) {
  const parsed = sellerStatusSchema.parse(input);
  
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .update({ 
      status: parsed.status, 
      rejection_reason: parsed.rejectionReason 
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update seller status: ${error.message}`);
  return data;
}

export async function updateSellerProfile(ownerId: string, input: unknown) {
  const parsed = sellerUpdateProfileSchema.parse(input);
  
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .update({ 
      description: parsed.description 
    })
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update seller profile: ${error.message}`);
  return data;
}
