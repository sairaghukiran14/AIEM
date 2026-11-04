import { NextResponse } from "next/server";

import { readJsonBody } from "@/lib/read-json";
import { z } from "zod";

import { hashPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { passwordSchema } from "@/lib/password-rules";
import { ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { hashResetToken } from "@/lib/reset-token";
import { PasswordReset } from "@/models/PasswordReset";
import { User } from "@/models/User";

const Schema = z.object({
  token: z.string().min(20, "This reset link is not valid").max(200),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const read = await readJsonBody(request, 4000);
  if (!read.ok) return read.response;
  const body: unknown = read.data;
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }

  try {
    const blocked = await limited(request, [{ policy: POLICIES.resetIp, id: ipOf(request) }]);
    if (blocked) return blocked;

    await connectDB();

    // Deleting the record is what spends the link, so it works exactly once even if used twice at once.
    const record = await PasswordReset.findOneAndDelete({
      tokenHash: hashResetToken(parsed.data.token),
      expiresAt: { $gt: new Date() },
    });
    if (!record) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    await User.updateOne(
      { _id: record.userId },
      { $set: { passwordHash: await hashPassword(parsed.data.password), passwordChangedAt: new Date() }, $inc: { sessionVersion: 1 } }
    );
    await PasswordReset.deleteMany({ userId: record.userId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
