import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().max(120).optional(),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  // SECURITY: "admin" is deliberately not accepted here. This enum previously included it, so
  // POST /auth/signup with {"role":"admin"} minted an administrator account on demand.
  // Administrators are provisioned out of band; sellers still require approval in the sellers table.
  role: z.enum(["buyer", "seller"]).default("buyer"),
  acceptedTerms: z.literal(true)
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(4, "OTP must be exactly 4 digits").regex(/^\d+$/, "OTP must contain only numbers")
});
