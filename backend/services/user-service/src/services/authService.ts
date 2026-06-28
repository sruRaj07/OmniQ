import { supabase } from "../../../../shared/utils/supabaseClient";
import { signInSchema, signUpSchema, verifyOtpSchema } from "../validators/authValidator";
import { generateAndStoreOtp, sendOtpEmail, verifyAndRetrieveSession } from "../utils/otpUtil";

export async function signUpWithEmail(input: unknown) {
  const validated = signUpSchema.parse(input);

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

  // Generate OTP and send email
  const otp = generateAndStoreOtp(validated.email, data.session);
  await sendOtpEmail(validated.email, otp);

  return { requires_2fa: true, email: validated.email };
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

  // Generate OTP and send email
  const otp = generateAndStoreOtp(validated.email, data.session);
  await sendOtpEmail(validated.email, otp);

  return { requires_2fa: true, email: validated.email };
}

export async function verifyOtp(input: unknown) {
  const validated = verifyOtpSchema.parse(input);
  
  const session = verifyAndRetrieveSession(validated.email, validated.otp);
  
  if (!session) {
    throw new Error("Invalid or expired OTP");
  }
  
  return { session };
}
