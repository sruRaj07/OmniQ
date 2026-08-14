import { supabase, supabaseAdmin } from "../../../../shared/utils/supabaseClient";
import { signInSchema, signUpSchema, verifyOtpSchema } from "../validators/authValidator";
import { generateAndStoreOtp, sendOtpEmail, verifyAndRetrieveSession } from "../utils/otpUtil";

export async function signUpWithEmail(input: unknown) {
  const validated = signUpSchema.parse(input);

  // Check if user already exists
  const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id").eq("email", validated.email).single();
  if (existingProfile) {
    throw new Error("User already registered");
  }

  const { data, error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
    options: {
      data: {
        role: validated.role,
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  // Auto-confirm the user email so they can log in immediately
  if (data.user) {
    await supabaseAdmin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
    
    // Explicitly create the user profile right away
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email: validated.email,
      full_name: validated.fullName || "",
      role: validated.role,
      terms_accepted_at: new Date().toISOString(),
      terms_version: "1.0",
      privacy_policy_accepted_at: new Date().toISOString(),
      privacy_policy_version: "1.0"
    });
    
    if (profileError) {
      console.error("Profile creation failed:", profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
  }

  // Now explicitly sign in to get a valid session
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  });

  if (signInError || !signInData.session) {
    throw new Error(signInError?.message || "Failed to obtain session after signup");
  }

  // Generate OTP and send email logic removed for now
  // const otp = generateAndStoreOtp(validated.email, signInData.session);
  // await sendOtpEmail(validated.email, otp);

  return { session: signInData.session, email: validated.email };
}

export async function signInWithEmail(input: unknown) {
  const validated = signInSchema.parse(input);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Generate OTP and send email logic removed for now
  // const otp = generateAndStoreOtp(validated.email, data.session);
  // await sendOtpEmail(validated.email, otp);

  return { session: data.session, email: validated.email };
}

export async function verifyOtp(input: unknown) {
  const validated = verifyOtpSchema.parse(input);
  
  const result = verifyAndRetrieveSession(validated.email, validated.otp);
  
  if (!result.valid) {
    throw new Error("Invalid or expired OTP");
  }
  
  return { session: result.session };
}
