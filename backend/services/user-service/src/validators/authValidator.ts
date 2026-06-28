import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["buyer", "seller", "admin"]).default("buyer")
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(4, "OTP must be exactly 4 digits").regex(/^\d+$/, "OTP must contain only numbers")
});
