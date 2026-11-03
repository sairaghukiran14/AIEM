import "server-only";

import { allGatesPassed } from "@/lib/certificate-core";
import { connectDB } from "@/lib/db";
import { getTrack, tracks } from "@/content";
import { Progress } from "@/models/Progress";
import { Submission } from "@/models/Submission";
import { User } from "@/models/User";

export type UserProgress = {
  /** Challenge ids the user has passed at least once. */
  passed: Set<string>;
  /** Best score per challenge id as a 0-1 fraction. */
  best: Map<string, number>;
  completedLessons: Set<string>;
};

export async function getUserProgress(userId: string): Promise<UserProgress> {
  await connectDB();

  const [subs, lessons] = await Promise.all([
    Submission.find({ userId }).select("challengeId score maxScore passed").lean(),
    Progress.find({ userId, status: "completed" }).select("lessonSlug").lean(),
  ]);

  const passed = new Set<string>();
  const best = new Map<string, number>();

  for (const s of subs) {
    if (s.passed) passed.add(s.challengeId);
    const frac = s.maxScore > 0 ? s.score / s.maxScore : 0;
    best.set(s.challengeId, Math.max(best.get(s.challengeId) ?? 0, frac));
  }

  return {
    passed,
    best,
    completedLessons: new Set(lessons.map((l) => l.lessonSlug)),
  };
}

export function emptyProgress(): UserProgress {
  return { passed: new Set(), best: new Map(), completedLessons: new Set() };
}

/** For pages: signed-out users and database hiccups both fall back to empty progress. */
export async function loadProgress(userId: string | null | undefined): Promise<UserProgress> {
  if (!userId) return emptyProgress();
  try {
    return await getUserProgress(userId);
  } catch {
    return emptyProgress();
  }
}

/** Fraction (0-1) of a track's challenges the user has passed, gate included. */
export function trackCompletion(
  challengeIds: string[],
  progress: UserProgress
): number {
  if (challengeIds.length === 0) return 0;
  return challengeIds.filter((id) => progress.passed.has(id)).length / challengeIds.length;
}

/** A track's gate unlocks once every lesson in it is complete. */
export function isGateUnlocked(trackSlug: string, progress: UserProgress): boolean {
  const track = getTrack(trackSlug);
  if (!track || !track.gate) return false;
  return track.lessons.every((l) => progress.completedLessons.has(l.slug));
}

/** The capstone opens once every track gate has been passed (or in review mode). */
export function isCapstoneUnlocked(progress: UserProgress): boolean {
  if (reviewUnlockAll()) return true;
  const gateIds = tracks.flatMap((t) => (t.gate ? [t.gate.id] : []));
  return allGatesPassed(gateIds, progress.passed);
}

export function isGatePassed(trackSlug: string, progress: UserProgress): boolean {
  const track = getTrack(trackSlug);
  return Boolean(track?.gate && progress.passed.has(track.gate.id));
}

/**
 * Review switch: with REVIEW_UNLOCK_ALL=1 every published track is open so the
 * whole course can be looked over without passing each gate. It is ignored in
 * production builds, so it cannot be left on by accident. Read per call so a
 * changed .env.local takes effect without a rebuild.
 */
function reviewUnlockAll(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.REVIEW_UNLOCK_ALL === "1";
}

/**
 * A track is unlocked when it is the first, or the previous track's gate is
 * passed. Unpublished tracks are never unlocked.
 */
export function isTrackUnlocked(trackSlug: string, progress: UserProgress): boolean {
  const index = tracks.findIndex((t) => t.slug === trackSlug);
  if (index < 0 || !tracks[index].published) return false;
  if (reviewUnlockAll()) return true;
  if (index === 0) return true;
  return isGatePassed(tracks[index - 1].slug, progress);
}

const todayUtc = () => new Date().toISOString().slice(0, 10);
const yesterdayUtc = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/** Adds XP, advances the streak once per UTC day, and grants any newly earned badges. */
export async function awardXp(userId: string, xp: number): Promise<{ streak: number }> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) return { streak: 0 };

  const today = todayUtc();
  if (user.lastActiveDay !== today) {
    user.streakCount = user.lastActiveDay === yesterdayUtc() ? user.streakCount + 1 : 1;
    user.lastActiveDay = today;
  }
  user.xp += xp;

  const has = (id: string) => user.badges.some((b) => b.badgeId === id);
  const grant = (badgeId: string, label: string) => {
    if (!has(badgeId)) user.badges.push({ badgeId, label, earnedAt: new Date() });
  };

  if (user.streakCount >= 3) grant("streak-3", "3-day streak");
  if (user.streakCount >= 7) grant("streak-7", "7-day streak");
  if (user.xp >= 500) grant("xp-500", "500 XP");

  await user.save();
  return { streak: user.streakCount };
}

export async function grantBadge(userId: string, badgeId: string, label: string) {
  await connectDB();
  await User.updateOne(
    { _id: userId, "badges.badgeId": { $ne: badgeId } },
    { $push: { badges: { badgeId, label, earnedAt: new Date() } } }
  );
}
