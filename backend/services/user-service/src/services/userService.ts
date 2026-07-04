/**
 * OmniQ user service - user business logic.
 * Author: OmniQ Team
 */
import { profileUpdateSchema, roleAssignmentSchema } from "../validators/userValidator";
import { supabase } from "../../../../shared/utils/supabaseClient";

export async function getCurrentProfile(userId: string, jwtPayload?: any) {
  let { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  
  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  // Lazy Initialization: If profile doesn't exist, auto-create it using metadata from JWT
  if (!data) {
    const metadata = jwtPayload?.user_metadata || {};
    
    const newProfile = {
      id: userId,
      email: metadata.email || jwtPayload?.email || "",
      full_name: metadata.full_name || metadata.name || "",
      role: metadata.role || "buyer"
    };

    const insertRes = await supabase
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (insertRes.error) {
      throw new Error(`Failed to initialize profile: ${insertRes.error.message}`);
    }
    data = insertRes.data;
  }

  return data;
}

export async function updateProfile(userId: string, input: unknown) {
  const validated = profileUpdateSchema.parse(input);
  
  const updatePayload: any = {
    full_name: validated.fullName,
    phone_number: validated.phoneNumber,
    address: validated.address,
    pincode: validated.pincode
  };

  // Remove undefined fields so we don't overwrite existing data with nulls
  Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);
  
  // First attempt to update
  let { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  // If the profile didn't exist, insert a new one
  if (!data) {
    updatePayload.id = userId;
    // Set a default role if this is a brand new profile insertion
    updatePayload.role = 'buyer';
    
    const insertRes = await supabase
      .from("profiles")
      .insert(updatePayload)
      .select()
      .single();
      
    if (insertRes.error) throw new Error(`Failed to create profile: ${insertRes.error.message}`);
    data = insertRes.data;
  }

  return data;
}

export async function assignRole(userId: string, input: unknown) {
  const validated = roleAssignmentSchema.parse(input);
  
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: validated.role })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to assign role: ${error.message}`);
  return data;
}
