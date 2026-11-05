import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { RateLimit } from "@/models/RateLimit";
import { clientIp, counterKey, decide, trustsProxyHeaders, waitText, windowStart, type Decision, type Policy } from "@/lib/rate-limit-core";

/** Policies for the account endpoints. Per-IP limits stop floods, per-email limits stop targeted guessing. */
export const POLICIES = {
  loginIp: { name: "login-ip", limit: 30, windowSec: 15 * 60 },
  loginEmail: { name: "login-email", limit: 8, windowSec: 15 * 60 },
  signupIp: { name: "signup-ip", limit: 10, windowSec: 60 * 60 },
  forgotIp: { name: "forgot-ip", limit: 5, windowSec: 60 * 60 },
  forgotEmail: { name: "forgot-email", limit: 3, windowSec: 60 * 60 },
  resetIp: { name: "reset-ip", limit: 10, windowSec: 60 * 60 },
  verifyIp: { name: "verify-ip", limit: 20, windowSec: 60 * 60 },
  resendUser: { name: "resend-user", limit: 3, windowSec: 60 * 60 },
  resendIp: { name: "resend-ip", limit: 10, windowSec: 60 * 60 },
  healthIp: { name: "health-ip", limit: 60, windowSec: 60 },
  submitUser: { name: "submit-user", limit: 90, windowSec: 5 * 60 },
  codeUser: { name: "code-user", limit: 20, windowSec: 5 * 60 },
  quizStartUser: { name: "quiz-start-user", limit: 30, windowSec: 60 * 60 },
  quizAnswerUser: { name: "quiz-answer-user", limit: 400, windowSec: 5 * 60 },
  accountUser: { name: "account-user", limit: 10, windowSec: 60 * 60 },
  // Voice interviews spend real money on each call, so their limits are per account and deliberately low.
  liveStartUser: { name: "live-start-user", limit: 3, windowSec: 24 * 60 * 60 },
  liveLongStartUser: { name: "live-long-start-user", limit: 1, windowSec: 24 * 60 * 60 },
  liveTurnUser: { name: "live-turn-user", limit: 120, windowSec: 60 * 60 },
  liveTranscribeUser: { name: "live-transcribe-user", limit: 240, windowSec: 60 * 60 },
  liveSpeechUser: { name: "live-speech-user", limit: 240, windowSec: 60 * 60 },
  liveFinishUser: { name: "live-finish-user", limit: 10, windowSec: 60 * 60 },
} satisfies Record<string, Policy>;

/** Identities are hashed so email addresses are not kept in the counters. */
export function hashed(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 24);
}

/** Counts one hit atomically and says whether it is within the limit. */
export async function consume(policy: Policy, id: string, now = Date.now()): Promise<Decision> {
  await connectDB();
  const windowMs = policy.windowSec * 1000;
  const windowEnd = windowStart(now, windowMs) + windowMs;
  const key = counterKey(policy, id, now);

  const update = { $inc: { count: 1 }, $setOnInsert: { resetAt: new Date(windowEnd) } };
  let doc;
  try {
    doc = await RateLimit.findOneAndUpdate({ key }, update, { upsert: true, returnDocument: "after" });
  } catch (err) {
    // Two requests can race to create the same counter. The loser retries and increments it.
    if ((err as { code?: number }).code !== 11000) throw err;
    doc = await RateLimit.findOneAndUpdate({ key }, update, { returnDocument: "after" });
  }
  return decide(doc?.count ?? 1, policy.limit, windowEnd, now);
}

/** Runs every check. Returns a 429 response when any is over its limit, otherwise null. */
export async function limited(
  request: Request,
  checks: { policy: Policy; id: string }[]
): Promise<NextResponse | null> {
  let worst: Decision | null = null;
  for (const { policy, id } of checks) {
    if (!id) continue; // no trustworthy client address: only the per-account limits apply
    const d = await consume(policy, id);
    if (!d.allowed && (!worst || d.retryAfterSec > worst.retryAfterSec)) worst = d;
  }
  if (!worst) return null;
  return NextResponse.json(
    { error: `Too many attempts. Please try again in ${waitText(worst.retryAfterSec)}.` },
    { status: 429, headers: { "Retry-After": String(worst.retryAfterSec) } }
  );
}

/** The caller's address, or an empty string when there is no proxy we trust to have set it honestly. */
export function ipOf(request: Request): string {
  return trustsProxyHeaders(process.env) ? clientIp(request.headers) : "";
}
