import "server-only";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { connectDB } from "@/lib/db";
import { sessionStatus } from "@/lib/session-core";
import { RevokedSession } from "@/models/RevokedSession";
import { User, type UserDoc } from "@/models/User";

const COOKIE_NAME = "aiem_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. See .env.example.");
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummyHash: string | null = null;

/**
 * Spends the same time as a real password check. Without it, an address with no account is answered immediately
 * while a known one takes a full bcrypt comparison, and that difference shows which addresses are registered.
 */
export async function spendPasswordCheckTime(password: string): Promise<void> {
  dummyHash ??= await bcrypt.hash("not-a-real-password", 10);
  await bcrypt.compare(password, dummyHash);
}

export async function createSession(userId: string, sessionVersion = 0) {
  const token = await new SignJWT({ uid: userId, sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

type Session = { uid: string; iat: number; exp: number; sv: number | undefined; jti: string | undefined };

async function readSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.uid !== "string") return null;
    return {
      uid: payload.uid,
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
      sv: typeof payload.sv === "number" ? payload.sv : undefined,
      jti: typeof payload.jti === "string" ? payload.jti : undefined,
    };
  } catch {
    return null;
  }
}

/** Returns the signed-in user's id, or null. Does not hit the database, so it cannot see a sign-out or a password reset. */
export async function getSessionUserId(): Promise<string | null> {
  return (await readSession())?.uid ?? null;
}

/** The user document if the session is still good: the account exists and the token was not signed out or outdated. */
async function validUser(session: Session): Promise<UserDoc | null> {
  await connectDB();
  const [doc, revoked] = await Promise.all([
    User.findById(session.uid).lean<UserDoc>(),
    session.jti ? RevokedSession.exists({ jti: session.jti }) : Promise.resolve(null),
  ]);
  if (!doc) return null;
  const status = sessionStatus({
    tokenVersion: session.sv,
    userVersion: doc.sessionVersion,
    issuedAt: session.iat,
    passwordChangedAt: doc.passwordChangedAt,
    revoked: Boolean(revoked),
  });
  return status === "ok" ? doc : null;
}

/** Like getSessionUserId, but checks the database, so a logout, a password reset or "sign out everywhere" take effect. */
export async function getActiveSessionUserId(): Promise<string | null> {
  const session = await readSession();
  if (!session) return null;
  try {
    return (await validUser(session)) ? session.uid : null;
  } catch {
    return null;
  }
}

/** Signs out just this browser's token, so a copied cookie stops working too. Then removes the cookie. */
export async function revokeCurrentSession() {
  const session = await readSession();
  if (session?.jti) {
    try {
      await connectDB();
      await RevokedSession.updateOne(
        { jti: session.jti },
        { $setOnInsert: { expiresAt: new Date(session.exp * 1000) } },
        { upsert: true }
      );
    } catch (err) {
      console.error("[logout] could not record the sign-out:", err);
    }
  }
  await destroySession();
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  xp: number;
  streakCount: number;
  badges: { badgeId: string; label: string; earnedAt: Date }[];
  hasAssessment: boolean;
  emailVerified: boolean;
};

function toSessionUser(doc: UserDoc): SessionUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    xp: doc.xp ?? 0,
    streakCount: doc.streakCount ?? 0,
    badges: (doc.badges ?? []).map((b) => ({
      badgeId: b.badgeId,
      label: b.label,
      earnedAt: b.earnedAt as Date,
    })),
    hasAssessment: Boolean(doc.assessment),
    emailVerified: Boolean(doc.emailVerifiedAt),
  };
}

/**
 * Returns the signed-in user, or null. The header and the page both ask during one render, so the answer is shared
 * for that render instead of repeating the database lookups.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await readSession();
  if (!session) return null;

  try {
    const doc = await validUser(session);
    return doc ? toSessionUser(doc) : null;
  } catch {
    // A database outage should not blow up every page; treat it as signed out.
    return null;
  }
});

/** For pages that require a session. Redirects to /login when there is none. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }
  return user;
}
