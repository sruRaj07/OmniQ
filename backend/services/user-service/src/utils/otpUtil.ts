type OtpStoreItem = {
  otp: string;
  session: any;
  expiresAt: number;
};

// In-memory store for OTPs (in production, use Redis)
const otpStore = new Map<string, OtpStoreItem>();

export function generateAndStoreOtp(email: string, session: any): string {
  // Generate a random 4-digit number
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Store it for 5 minutes
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email, { otp, session, expiresAt });
  
  return otp;
}

export function verifyAndRetrieveSession(email: string, enteredOtp: string): { valid: boolean; session: any | null } {
  const record = otpStore.get(email);
  if (!record) return { valid: false, session: null };

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { valid: false, session: null }; // Expired
  }

  if (record.otp !== enteredOtp) {
    return { valid: false, session: null }; // Invalid OTP
  }

  // OTP is valid! Return session and delete the record so it can't be reused
  otpStore.delete(email);
  return { valid: true, session: record.session };
}

import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, otp: string) {
  // Only attempt to send if credentials are provided in .env
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"OmniQ Security" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Your OmniQ Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verification Code</h2>
            <p>Your 4-digit OmniQ verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">${otp}</h1>
            <p>This code will expire in 5 minutes.</p>
          </div>
        `,
      });
      console.log(`[NODEMAILER] Successfully sent OTP to ${email}`);
    } catch (error: any) {
      console.error(`[NODEMAILER] Error sending email to ${email}:`, error);
      // Fallback to mock log so developers don't get blocked if Gmail fails
      fallbackMockLog(email, otp);
    }
  } else {
    // If no credentials, fallback to console log
    fallbackMockLog(email, otp);
  }
}

function fallbackMockLog(email: string, otp: string) {
  console.log("\n==================================================");
  console.log(`[MOCK EMAIL] To: ${email}`);
  console.log(`[MOCK EMAIL] Subject: Your OmniQ Login Code`);
  console.log(`[MOCK EMAIL] Body: Your 4-digit verification code is: ${otp}`);
  console.log("==================================================\n");
}
