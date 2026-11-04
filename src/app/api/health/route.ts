import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Reports whether the deployment is configured, without revealing any value.
 * Booleans only, so it is safe to leave public and useful for checking an environment.
 */
export async function GET() {
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
    mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
    siteUrlSet: Boolean(process.env.SITE_URL),
  };
  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
