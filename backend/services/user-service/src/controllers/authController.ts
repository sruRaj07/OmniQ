import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { signInWithEmail, signUpWithEmail, verifyOtp } from "../services/authService";

export async function signUpController(request: Request, response: Response): Promise<void> {
  try {
    const data = await signUpWithEmail(request.body);
    response.json(ok(data));
  } catch (error: any) {
    response.status(400).json(fail("SIGNUP_FAILED", error.message));
  }
}

export async function signInController(request: Request, response: Response): Promise<void> {
  try {
    const data = await signInWithEmail(request.body);
    response.json(ok(data));
  } catch (error: any) {
    response.status(400).json(fail("SIGNIN_FAILED", error.message));
  }
}

export async function verifyOtpController(request: Request, response: Response): Promise<void> {
  try {
    const data = await verifyOtp(request.body);
    response.json(ok(data));
  } catch (error: any) {
    response.status(400).json(fail("OTP_VERIFICATION_FAILED", error.message));
  }
}
