import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { connectDB } from "@/lib/db";
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

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
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

/** Returns the signed-in user's id, or null. Does not hit the database. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  xp: number;
  streakCount: number;
  badges: { badgeId: string; label: string; earnedAt: Date }[];
  hasAssessment: boolean;
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
  };
}

/** Returns the signed-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  try {
    await connectDB();
    const doc = await User.findById(userId).lean<UserDoc>();
    return doc ? toSessionUser(doc) : null;
  } catch {
    // A database outage should not blow up every page; treat it as signed out.
    return null;
  }
}

/** For pages that require a session. Redirects to /login when there is none. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }
  return user;
}
