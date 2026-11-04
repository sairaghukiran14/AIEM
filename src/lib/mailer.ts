import "server-only";

import { buildResendRequest, type Mail } from "@/lib/mailer-core";

export class MailNotConfigured extends Error {}

/** The provider refused the message. Carries what Resend said, which is about the sender or the key, never a secret. */
export class MailRejected extends Error {
  constructor(
    public status: number,
    public providerName: string,
    public providerMessage: string
  ) {
    super(`Email provider returned ${status}: ${providerName}: ${providerMessage}`);
  }
}

/**
 * Sends one email through Resend when RESEND_API_KEY and MAIL_FROM are set.
 * Without them, development logs the message to the server console so the link can be used,
 * and production throws, so a missing provider is loud in the logs instead of silent.
 */
export async function sendMail(mail: Mail): Promise<void> {
  // Values pasted into a dashboard often carry a trailing newline, spaces or surrounding quotes. Strip them.
  const clean = (v: string | undefined) => v?.trim().replace(/^["']+|["']+$/g, "").trim();
  const apiKey = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.MAIL_FROM);

  if (apiKey && from) {
    const { url, init } = buildResendRequest(mail, apiKey, from);
    const res = await fetch(url, init);
    if (!res.ok) {
      let name = "unknown_error";
      let message = "";
      try {
        const body = (await res.json()) as { name?: string; message?: string };
        name = body.name ?? name;
        message = (body.message ?? "").slice(0, 300);
      } catch {
        /* a non-JSON error body: the status is all there is */
      }
      throw new MailRejected(res.status, name, message);
    }
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[mail:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  throw new MailNotConfigured("Set RESEND_API_KEY and MAIL_FROM to send email.");
}

/** What to tell a signed-in caller about a failed send: the provider's own reason, so a misconfigured sender can be fixed. */
export function mailFailure(err: unknown): { reason?: string; detail?: string } {
  if (err instanceof MailRejected) return { reason: err.providerName, detail: err.providerMessage };
  if (err instanceof MailNotConfigured) return { reason: "not_configured" };
  return {};
}
