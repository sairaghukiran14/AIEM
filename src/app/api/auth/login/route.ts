import { NextResponse } from "next/server";

import { readJsonBody } from "@/lib/read-json";
import { z } from "zod";

import { createSession, spendPasswordCheckTime, verifyPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { hashed, ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { User, type UserDoc } from "@/models/User";

const LoginSchema = z.object({
  email: z.email("Enter a valid email address").max(254, "Email address is too long"),
  password: z.string().min(1, "Enter your password"),
});

export async function POST(request: Request) {
  const read = await readJsonBody(request, 8000);
  if (!read.ok) return read.response;
  const body: unknown = read.data;

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  try {
    // Before any password work: a per-address limit stops guessing at one account from many
    // addresses, and a per-IP limit stops one source from trying many accounts.
    const blocked = await limited(request, [
      { policy: POLICIES.loginIp, id: ipOf(request) },
      { policy: POLICIES.loginEmail, id: hashed(email) },
    ]);
    if (blocked) return blocked;

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() }).lean<UserDoc>();
    // Same message either way, so the form does not reveal which emails exist.
    const invalid = NextResponse.json(
      { error: "Email or password is incorrect" },
      { status: 401 }
    );
    if (!user) {
      await spendPasswordCheckTime(password);
      return invalid;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return invalid;

    await createSession(user._id.toString(), user.sessionVersion ?? 0);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json(
      { error: "Could not reach the database. Is MongoDB running?" },
      { status: 500 }
    );
  }
}
