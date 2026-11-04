/** Pure rules for email verification, kept free of the database so they can be tested directly. */

export const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

type Env = Record<string, string | undefined>;

/**
 * Whether certificates are held until the address is verified.
 * REQUIRE_EMAIL_VERIFICATION=1 forces it on and =0 forces it off. Otherwise it is on exactly when email
 * can be sent, because requiring verification when nobody can receive the email would lock everyone out.
 */
export function verificationRequired(env: Env): boolean {
  if (env.REQUIRE_EMAIL_VERIFICATION === "1") return true;
  if (env.REQUIRE_EMAIL_VERIFICATION === "0") return false;
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

/** May this person be issued certificates now? */
export function canReceiveCertificates(required: boolean, verifiedAt: Date | null | undefined): boolean {
  return !required || Boolean(verifiedAt);
}
