import { NextResponse } from "next/server";

import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { User, type UserDoc } from "@/models/User";

export async function POST(request: Request) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });

  try {
    const blocked = await limited(request, [
      { policy: POLICIES.resendUser, id: userId },
      { policy: POLICIES.resendIp, id: ipOf(request) },
    ]);
    if (blocked) return blocked;

    await connectDB();
    const user = await User.findById(userId).lean<UserDoc>();
    if (!user) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
    if (user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

    try {
      await sendVerificationEmail(user, new URL(request.url).origin);
    } catch (err) {
      console.error("[resend-verification] could not send the email:", err);
      return NextResponse.json(
        { error: "We could not send the email just now. Please try again later." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
