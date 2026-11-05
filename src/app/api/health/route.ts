import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { ipOf, limited, POLICIES } from "@/lib/rate-limit";
import { emailFeaturesEnabled } from "@/lib/features";
import { isVerificationRequired } from "@/lib/email-verification";

export const dynamic = "force-dynamic";

/**
 * Reports whether the deployment is configured, without revealing any value.
 * Booleans only, so it is safe to leave public and useful for checking an environment.
 */
export async function GET(request: Request) {
  // Each call pings the database, so keep one address from hammering it. (Skipped when no trusted proxy gives an address.)
  try {
    const blocked = await limited(request, [{ policy: POLICIES.healthIp, id: ipOf(request) }]);
    if (blocked) return blocked;
  } catch {
    // if even the limiter cannot reach the database, the check below reports it
  }
  let db = false;
  try {
    const conn = await connectDB();
    await conn.connection.db?.admin().ping();
    db = true;
  } catch {
    db = false;
  }
  const body = {
    ok: db && Boolean(process.env.AUTH_SECRET),
    database: db,
    authSecretSet: Boolean(process.env.AUTH_SECRET),
    emailFeaturesEnabled: emailFeaturesEnabled(),
    mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
    siteUrlSet: Boolean(process.env.SITE_URL),
    liveInterviewConfigured: Boolean(process.env.SARVAM_API_KEY && process.env.ANTHROPIC_API_KEY),
    emailVerificationRequired: isVerificationRequired(),
  };
  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
