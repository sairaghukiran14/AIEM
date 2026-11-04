import { NextResponse } from "next/server";

import { readJsonBody } from "@/lib/read-json";
import { z } from "zod";

import { createSession, hashPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { passwordSchema } from "@/lib/password-rules";
import { ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { User } from "@/models/User";

const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or fewer"),
  email: z.email("Enter a valid email address").max(254, "Email address is too long"),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const read = await readJsonBody(request, 8000);
  if (!read.ok) return read.response;
  const body: unknown = read.data;

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const blocked = await limited(request, [{ policy: POLICIES.signupIp, id: ipOf(request) }]);
    if (blocked) return blocked;

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 }
      );
    }

    let user;
    try {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
      });
    } catch (err) {
      // Two signups for one address at the same moment: the unique index lets one win.
      if ((err as { code?: number }).code === 11000) {
        return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
      }
      throw err;
    }

    await createSession(user._id.toString(), 0);

    // Best effort: signing up must not fail because an email could not be sent. The dashboard offers a resend.
    try {
      await sendVerificationEmail(user, new URL(request.url).origin);
    } catch (err) {
      console.error("[signup] could not send the verification email:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json(
      { error: "Could not reach the database. Is MongoDB running?" },
      { status: 500 }
    );
  }
}
