import "server-only";

import type mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { canReceiveCertificates, VERIFICATION_TOKEN_LIFETIME_MS, verificationRequired } from "@/lib/email-verification-core";
import { sendMail } from "@/lib/mailer";
import { verifyEmail } from "@/lib/mailer-core";
import { reconcileCertificates, type IssuedCertificate } from "@/lib/certificates";
import { hashResetToken, newResetToken } from "@/lib/reset-token";
import { EmailVerification } from "@/models/EmailVerification";
import { User } from "@/models/User";

export function isVerificationRequired(): boolean {
  return verificationRequired(process.env);
}

/** Creates a fresh link (replacing any older one) and emails it. Throws if the email cannot be sent. */
export async function sendVerificationEmail(user: { _id: mongoose.Types.ObjectId; name: string; email: string }, origin: string): Promise<void> {
  await connectDB();
  await EmailVerification.deleteMany({ userId: user._id });
  const token = newResetToken();
  await EmailVerification.create({
    userId: user._id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_LIFETIME_MS),
  });
  const base = process.env.SITE_URL ?? origin;
  const { subject, text } = verifyEmail(user.name, `${base}/verify-email?token=${token}`);
  await sendMail({ to: user.email, subject, text });
}

/**
 * Issues the certificates a person has earned, unless verification is required and their address is not
 * confirmed yet. Returns what was issued, plus whether anything is being held back.
 */
export async function reconcileIfAllowed(
  userId: string,
  holderName: string
): Promise<{ issued: IssuedCertificate[]; held: boolean }> {
  await connectDB();
  const doc = await User.findById(userId).select("emailVerifiedAt").lean<{ emailVerifiedAt?: Date | null }>();
  if (!canReceiveCertificates(isVerificationRequired(), doc?.emailVerifiedAt)) {
    return { issued: [], held: true };
  }
  return { issued: await reconcileCertificates(userId, holderName), held: false };
}
