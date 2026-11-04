/**
 * Email features (verification, forgot password, changing the email address) are paused.
 * Set ENABLE_EMAIL_FEATURES=1 to switch them all back on; they also need RESEND_API_KEY and MAIL_FROM.
 */
export function emailFeaturesEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.ENABLE_EMAIL_FEATURES === "1";
}

/** The response every email-only endpoint gives while the features are paused. */
export function emailOffResponse(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}
