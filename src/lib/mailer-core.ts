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

export function verifyEmail(name: string, link: string): { subject: string; text: string } {
  return {
    subject: "Confirm your email for AIEM",
    text:
      `Hi ${name},\n\n` +
      `Welcome to AIEM. Please confirm that this is your email address by opening this link within 24 hours:\n\n` +
      `${link}\n\n` +
      `Certificates you earn are issued once your address is confirmed.\n\n` +
      `If you did not create an account, you can ignore this email.\n`,
  };
}

export function emailChangeConfirm(name: string, newEmail: string, link: string): { subject: string; text: string } {
  return {
    subject: "Confirm your new email for AIEM",
    text:
      `Hi ${name},\n\n` +
      `Someone asked to change the email address on your AIEM account to ${newEmail}. To confirm that this address is yours, open this link within one hour:\n\n` +
      `${link}\n\n` +
      `After you confirm, you will sign in with this address, and any other devices that are signed in will be signed out.\n\n` +
      `If you did not ask for this, ignore this email and nothing will change.\n`,
  };
}

/** Sent to the OLD address, so the owner can notice a change they did not make. Never includes a link that does anything. */
export function emailChangeNotice(name: string, newEmail: string): { subject: string; text: string } {
  const [local, domain] = newEmail.split("@");
  const hidden = `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
  return {
    subject: "A change of email address was requested on your AIEM account",
    text:
      `Hi ${name},\n\n` +
      `A request was made to change the email address on your AIEM account to ${hidden}. Nothing has changed yet: the new address has to confirm first.\n\n` +
      `If this was you, no action is needed. If it was not, sign in and change your password, and use "Sign out everywhere" on your account page.\n`,
  };
}
