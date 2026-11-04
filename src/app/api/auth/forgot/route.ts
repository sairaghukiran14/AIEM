import { after, NextResponse } from "next/server";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { resetEmail } from "@/lib/mailer-core";
import { sendMail } from "@/lib/mailer";
import { readJsonBody } from "@/lib/read-json";
import { hashed, ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { hashResetToken, newResetToken, RESET_TOKEN_LIFETIME_MS } from "@/lib/reset-token";
import { PasswordReset } from "@/models/PasswordReset";
import { User, type UserDoc } from "@/models/User";

const Schema = z.object({ email: z.email("Enter a valid email address").max(254, "Email address is too long") });

export async function POST(request: Request) {
  const read = await readJsonBody(request, 4000);
  if (!read.ok) return read.response;
  const parsed = Schema.safeParse(read.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const origin = process.env.SITE_URL ?? new URL(request.url).origin;

  try {
    const blocked = await limited(request, [
      { policy: POLICIES.forgotIp, id: ipOf(request) },
      { policy: POLICIES.forgotEmail, id: hashed(email) },
    ]);
    if (blocked) return blocked;

    // The lookup, the token and the email all happen after the response has gone. An address with no account
    // would otherwise be answered faster than one that sends an email, and that difference shows which are registered.
    after(async () => {
      try {
        await connectDB();
        const user = await User.findOne({ email }).lean<UserDoc>();
        if (!user) return;

        // Only the newest link works.
        await PasswordReset.deleteMany({ userId: user._id });
        const token = newResetToken();
        await PasswordReset.create({
          userId: user._id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
        });
        const { subject, text } = resetEmail(user.name, `${origin}/reset-password?token=${token}`);
        await sendMail({ to: user.email, subject, text });
      } catch (err) {
        // Delivery problems belong in the logs, not in the form.
        console.error("[forgot] could not send the reset email:", err);
      }
    });
    // The same answer whether or not the address has an account, so this cannot be used to find accounts.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
