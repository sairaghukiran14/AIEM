import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { resetEmail } from "@/lib/mailer-core";
import { sendMail } from "@/lib/mailer";
import { hashed, ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { hashResetToken, newResetToken, RESET_TOKEN_LIFETIME_MS } from "@/lib/reset-token";
import { PasswordReset } from "@/models/PasswordReset";
import { User, type UserDoc } from "@/models/User";

const Schema = z.object({ email: z.email("Enter a valid email address") });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // The same answer whether or not the address has an account, so this cannot be used to find accounts.
  const generic = NextResponse.json({ ok: true });

  try {
    const blocked = await limited(request, [
      { policy: POLICIES.forgotIp, id: ipOf(request) },
      { policy: POLICIES.forgotEmail, id: hashed(email) },
    ]);
    if (blocked) return blocked;

    await connectDB();
    const user = await User.findOne({ email }).lean<UserDoc>();
    if (!user) return generic;

    // Only the newest link works.
    await PasswordReset.deleteMany({ userId: user._id });
    const token = newResetToken();
    await PasswordReset.create({
      userId: user._id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
    });

    const base = process.env.SITE_URL ?? new URL(request.url).origin;
    const { subject, text } = resetEmail(user.name, `${base}/reset-password?token=${token}`);
    try {
      await sendMail({ to: user.email, subject, text });
    } catch (err) {
      // The caller still gets the generic answer. Delivery problems belong in the logs, not in the form.
      console.error("[forgot] could not send the reset email:", err);
    }
    return generic;
  } catch (err) {
    console.error("[forgot]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
