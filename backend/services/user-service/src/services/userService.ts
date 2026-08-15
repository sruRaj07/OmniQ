/**
 * OmniQ user service - user business logic.
 * Author: OmniQ Team
 */
import { profileUpdateSchema, roleAssignmentSchema } from "../validators/userValidator";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

export async function getCurrentProfile(userId: string, verifiedEmail?: string) {
  let { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  // Lazy initialisation: if the profile row does not exist yet, create it from the auth record.
  //
  // SECURITY: the previous version seeded `role` from the JWT's user_metadata. user_metadata is
  // writable by the client via supabase.auth.updateUser and at sign-up, so a user could self-assign
  // "admin" and have it persisted into profiles on first read. New profiles are always buyers;
  // elevation goes through assignRole, which is admin-only.
  if (!data) {
    let displayName = "";
    let email = verifiedEmail || "";

    // auth.admin is the authoritative source for the display name. Falling back to an empty name
    // is fine - the profile screen lets the user set it.
    const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUser.data?.user) {
      const metadata = (authUser.data.user.user_metadata || {}) as Record<string, unknown>;
      displayName = String(metadata.full_name || metadata.name || "");
      email = authUser.data.user.email || email;
    }

    const insertRes = await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, email, full_name: displayName, role: "buyer" })
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
  let { data, error } = await supabaseAdmin
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
    
    const insertRes = await supabaseAdmin
      .from("profiles")
      .insert(updatePayload)
      .select()
      .single();
      
    if (insertRes.error) throw new Error(`Failed to create profile: ${insertRes.error.message}`);
    data = insertRes.data;
  }

  return data;
}

/**
 * Admin-only role assignment. The caller is NOT the subject: the target user id comes from the
 * validated body. The previous version applied request.body.role to the *caller's own* id, so any
 * signed-in user could POST {"role":"admin"} and promote themselves. The route is now wrapped in
 * requireRole("admin") - see server.ts.
 *
 * Two places hold the role and both must move together:
 *   - auth app_metadata.role - the authoritative claim, minted into the JWT and enforced server-side
 *   - public.profiles.role   - a mirror the app reads to decide which UI group to route into
 * app_metadata is written first: if the profile write then fails the user has the permission but
 * not the UI, which is recoverable. The reverse would show an admin console that every API rejects.
 */
export async function assignRole(input: unknown) {
  const validated = roleAssignmentSchema.parse(input);

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(validated.userId, {
    app_metadata: { role: validated.role }
  });
  if (authError) throw new Error(`Failed to assign role: ${authError.message}`);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ role: validated.role })
    .eq("id", validated.userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to assign role: ${error.message}`);
  return data;
}

/**
 * Create a user request (data_export or account_deletion).
 * Prevents duplicate pending requests of the same type.
 */
export async function createUserRequest(userId: string, type: string, reason?: string) {
  if (!["data_export", "account_deletion"].includes(type)) {
    throw new Error("Invalid request type. Must be 'data_export' or 'account_deletion'.");
  }

  // Check for existing pending request of the same type
  const { data: existing } = await supabaseAdmin
    .from("user_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    throw new Error(`You already have a pending ${type.replace("_", " ")} request.`);
  }

  const { data, error } = await supabaseAdmin
    .from("user_requests")
    .insert({ user_id: userId, type, reason: reason || null })
    .select()
    .single();

  if (error) throw new Error(`Failed to create request: ${error.message}`);
  return data;
}

/**
 * Get all requests for a specific user.
 */
export async function getUserRequests(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);
  return data || [];
}
