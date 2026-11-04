import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/read-json";
import { hashResetToken } from "@/lib/reset-token";
import { EmailChange } from "@/models/EmailChange";
import { EmailVerification } from "@/models/EmailVerification";
import { PasswordReset } from "@/models/PasswordReset";
import { User } from "@/models/User";

const Schema = z.object({ token: z.string().min(20, "This confirmation link is not valid").max(200) });

export async function POST(request: Request) {
  const read = await readJsonBody(request, 4000);
  if (!read.ok) return read.response;
  const parsed = Schema.safeParse(read.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }

  try {
    const blocked = await limited(request, [{ policy: POLICIES.verifyIp, id: ipOf(request) }]);
    if (blocked) return blocked;

    await connectDB();
    // Deleting the record spends the link, so it works once even if used twice at the same moment.
    const record = await EmailChange.findOneAndDelete({
      tokenHash: hashResetToken(parsed.data.token),
      expiresAt: { $gt: new Date() },
    });
    if (!record) {
      return NextResponse.json(
        { error: "This confirmation link is invalid or has expired. Ask for a new one from your account page." },
        { status: 400 }
      );
    }

    try {
      // Opening the link from the new address proves it is theirs, so it counts as verified. Every session is
      // signed out, because the address is the sign-in name, and old links sent to the previous address are void.
      await User.updateOne(
        { _id: record.userId },
        { $set: { email: record.newEmail, emailVerifiedAt: new Date() }, $inc: { sessionVersion: 1 } }
      );
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
      }
      throw err;
    }
    await PasswordReset.deleteMany({ userId: record.userId });
    await EmailVerification.deleteMany({ userId: record.userId });
    await EmailChange.deleteMany({ userId: record.userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[confirm-email-change]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
