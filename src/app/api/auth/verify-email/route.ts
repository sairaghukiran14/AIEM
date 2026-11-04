import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { reconcileCertificates } from "@/lib/certificates";
import { ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { hashResetToken } from "@/lib/reset-token";
import { EmailVerification } from "@/models/EmailVerification";
import { User } from "@/models/User";

const Schema = z.object({ token: z.string().min(20, "This confirmation link is not valid").max(200) });

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

  try {
    const blocked = await limited(request, [{ policy: POLICIES.verifyIp, id: ipOf(request) }]);
    if (blocked) return blocked;

    await connectDB();
    // Deleting the record spends the link, so it works once even if used twice at the same moment.
    const record = await EmailVerification.findOneAndDelete({
      tokenHash: hashResetToken(parsed.data.token),
      expiresAt: { $gt: new Date() },
    });
    if (!record) {
      return NextResponse.json(
        { error: "This confirmation link is invalid or has expired. Sign in and ask for a new one." },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { _id: record.userId },
      { $set: { emailVerifiedAt: new Date() } },
      { returnDocument: "after" }
    ).lean<{ name: string } | null>();
    await EmailVerification.deleteMany({ userId: record.userId });

    // Release any certificates that were being held. A failure here is not the person's problem: the
    // certificates page issues them on its next visit.
    let issued = 0;
    try {
      if (user) issued = (await reconcileCertificates(record.userId.toString(), user.name)).filter((c) => c.created).length;
    } catch (err) {
      console.error("[verify-email] could not issue held certificates:", err);
    }
    return NextResponse.json({ ok: true, certificatesIssued: issued });
  } catch (err) {
    console.error("[verify-email]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
