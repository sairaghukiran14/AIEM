/** Builds the request for the Resend email API. Kept pure so it can be tested without sending anything. */

export type Mail = { to: string; subject: string; text: string };

export type MailRequest = { url: string; init: { method: "POST"; headers: Record<string, string>; body: string } };

export function buildResendRequest(mail: Mail, apiKey: string, from: string): MailRequest {
  return {
    url: "https://api.resend.com/emails",
    init: {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
    },
  };
}

export function resetEmail(name: string, link: string): { subject: string; text: string } {
  return {
    subject: "Reset your AIEM password",
    text:
      `Hi ${name},\n\n` +
      `Someone asked to reset the password for your AIEM account. To choose a new one, open this link within one hour:\n\n` +
      `${link}\n\n` +
      `If you did not ask for this, you can ignore this email and your password will stay as it is.\n`,
  };
}
