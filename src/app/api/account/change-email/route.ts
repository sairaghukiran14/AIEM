import { NextResponse } from "next/server";
import { z } from "zod";

import { getActiveSessionUserId, verifyPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { emailChangeConfirm, emailChangeNotice } from "@/lib/mailer-core";
import { sendMail } from "@/lib/mailer";
import { ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/read-json";
import { hashResetToken, newResetToken } from "@/lib/reset-token";
import { EmailChange } from "@/models/EmailChange";
import { User, type UserDoc } from "@/models/User";

const Schema = z.object({
  newEmail: z.email("Enter a valid email address").max(254, "Email address is too long"),
  password: z.string().min(1, "Enter your current password").max(200),
});
const LIFETIME_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });

  const read = await readJsonBody(request, 4000);
  if (!read.ok) return read.response;
  const parsed = Schema.safeParse(read.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }
  const newEmail = parsed.data.newEmail.toLowerCase();

  try {
    const blocked = await limited(request, [
      { policy: POLICIES.accountUser, id: userId },
      { policy: POLICIES.accountUser, id: ipOf(request) },
    ]);
    if (blocked) return blocked;

    await connectDB();
    const user = await User.findById(userId).lean<UserDoc>();
    if (!user) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });

    // Changing the address is as sensitive as changing the password, so it needs the current password.
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "That password is not correct" }, { status: 401 });
    }
    if (newEmail === user.email) {
      return NextResponse.json({ error: "That is already your email address" }, { status: 400 });
    }
    if (await User.exists({ email: newEmail })) {
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
    }

    await EmailChange.deleteMany({ userId: user._id }); // only the newest request counts
    const token = newResetToken();
    await EmailChange.create({
      userId: user._id,
      newEmail,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + LIFETIME_MS),
    });

    const base = process.env.SITE_URL ?? new URL(request.url).origin;
    try {
      const confirm = emailChangeConfirm(user.name, newEmail, `${base}/confirm-email?token=${token}`);
      await sendMail({ to: newEmail, subject: confirm.subject, text: confirm.text });
      const notice = emailChangeNotice(user.name, newEmail);
      await sendMail({ to: user.email, subject: notice.subject, text: notice.text });
    } catch (err) {
      console.error("[change-email] could not send the emails:", err);
      return NextResponse.json({ error: "We could not send the email just now. Please try again later." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[change-email]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
