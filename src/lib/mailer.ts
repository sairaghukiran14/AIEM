import "server-only";

import { buildResendRequest, type Mail } from "@/lib/mailer-core";

export class MailNotConfigured extends Error {}

/**
 * Sends one email through Resend when RESEND_API_KEY and MAIL_FROM are set.
 * Without them, development logs the message to the server console so the link can be used,
 * and production throws, so a missing provider is loud in the logs instead of silent.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (apiKey && from) {
    const { url, init } = buildResendRequest(mail, apiKey, from);
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[mail:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  throw new MailNotConfigured("Set RESEND_API_KEY and MAIL_FROM to send email.");
}
