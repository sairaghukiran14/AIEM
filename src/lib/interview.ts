import { tracks } from "@/content";
import { interviewDifficulty } from "@/content/interview-difficulty";

export type MockQuestion = {
  id: string;
  trackTitle: string;
  trackSlug: string;
  lessonTitle: string;
  lessonSlug: string;
  question: string;
  answer: string;
  weakAnswer?: string;
  followUp?: string;
  difficulty: 1 | 2 | 3;
};

function all(): MockQuestion[] {
  return tracks
    .filter((t) => t.published)
    .flatMap((t) =>
      t.lessons.flatMap((l) =>
        l.interview.map((q, i) => ({
          id: `${l.slug}:${i}`,
          trackTitle: t.title,
          trackSlug: t.slug,
          lessonTitle: l.title,
          lessonSlug: l.slug,
          question: q.question,
          answer: q.answer,
          weakAnswer: q.weakAnswer,
          followUp: q.followUp,
          difficulty: interviewDifficulty[`${l.slug}:${i}`] ?? 2,
        }))
      )
    );
}

function sample<T>(items: T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Every question a live interview may draw from, for one track or all of them. */
export function questionPool(track: string): MockQuestion[] {
  return track === "mixed" ? all() : all().filter((q) => q.trackSlug === track);
}

/** A random set of interview questions from one track, or from every track when 'mixed'. */
export function pickQuestions(track: string, n: number): MockQuestion[] {
  const pool = track === "mixed" ? all() : all().filter((q) => q.trackSlug === track);
  return sample(pool, Math.max(1, Math.min(n, pool.length)));
}

export function questionCount(track: string): number {
  return track === "mixed" ? all().length : all().filter((q) => q.trackSlug === track).length;
}
