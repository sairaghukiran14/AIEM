import type { Challenge, Lesson, Quiz, Track } from "@/content/types";
import { balancedOrders } from "@/lib/shuffle";

import { capstone } from "./capstone";
import { extras } from "./extras";
import { llmFoundations } from "./tracks/llm-foundations";
import { promptEngineering } from "./tracks/prompt-engineering";
import { embeddingsAndSearch } from "./tracks/embeddings-and-search";
import { ragSystems } from "./tracks/rag-systems";
import { toolsAndAgents } from "./tracks/tools-and-agents";
import { evalsAndObservability } from "./tracks/evals-and-observability";
import { fineTuning } from "./tracks/fine-tuning";
import { productionAi } from "./tracks/production-ai";
import { advancedRag } from "./tracks/advanced-rag";
import { servingAndMultimodal } from "./tracks/serving-and-multimodal";

/** Appends the practice blocks in `extras` to each lesson's sections. */
function withExtras(track: Track): Track {
  return {
    ...track,
    lessons: track.lessons.map((lesson) => {
      const more = extras[lesson.slug];
      if (!more) return lesson;
      return {
        ...lesson,
        concept: [...lesson.concept, ...(more.concept ?? [])],
        underTheHood: [...lesson.underTheHood, ...(more.underTheHood ?? [])],
      };
    }),
  };
}

export const tracks: Track[] = [llmFoundations, promptEngineering, embeddingsAndSearch, ragSystems, toolsAndAgents, evalsAndObservability, fineTuning, productionAi, advancedRag, servingAndMultimodal]
  .map(withExtras)
  .sort((a, b) => a.order - b.order);

export const publishedTracks = tracks.filter((t) => t.published);

/* ------------------------------------------------------------- lookups */

export function getTrack(slug: string): Track | undefined {
  return tracks.find((t) => t.slug === slug);
}

export function getLesson(
  trackSlug: string,
  lessonSlug: string
): { track: Track; lesson: Lesson } | undefined {
  const track = getTrack(trackSlug);
  const lesson = track?.lessons.find((l) => l.slug === lessonSlug);
  return track && lesson ? { track, lesson } : undefined;
}

/** Previous/next lesson within a track, for the lesson footer. */
export function getLessonNeighbours(track: Track, lesson: Lesson) {
  const index = track.lessons.findIndex((l) => l.slug === lesson.slug);
  return {
    prev: index > 0 ? track.lessons[index - 1] : null,
    next: index < track.lessons.length - 1 ? track.lessons[index + 1] : null,
    index,
  };
}

export type ChallengeLocation = {
  challenge: Challenge;
  /** Null for the capstone, which belongs to the course rather than a track. */
  track: Track | null;
  lesson: Lesson | null;
};

export { capstone };

/** Finds any challenge (lesson challenge, track gate or the capstone) by id. */
export function getChallenge(id: string): ChallengeLocation | undefined {
  if (capstone.id === id) return { challenge: capstone, track: null, lesson: null };

  for (const track of tracks) {
    if (track.gate?.id === id) {
      return { challenge: track.gate, track, lesson: null };
    }
    for (const lesson of track.lessons) {
      const challenge = lesson.challenges.find((c) => c.id === id);
      if (challenge) return { challenge, track, lesson };
    }
  }
  return undefined;
}

export function allLessonSlugs(): { trackSlug: string; lessonSlug: string }[] {
  return tracks.flatMap((t) =>
    t.lessons.map((l) => ({ trackSlug: t.slug, lessonSlug: l.slug }))
  );
}

/* --------------------------------------------------------------- totals */

export function trackXp(track: Track): number {
  const lessonXp = track.lessons.reduce(
    (sum, lesson) =>
      sum + lesson.challenges.reduce((s, c) => s + c.xp, 0),
    0
  );
  return lessonXp + (track.gate?.xp ?? 0);
}

export const courseTotals = {
  tracks: tracks.length,
  publishedTracks: publishedTracks.length,
  lessons: tracks.reduce((n, t) => n + t.lessons.length, 0),
  challenges: tracks.reduce(
    (n, t) =>
      n +
      t.lessons.reduce((m, l) => m + l.challenges.length, 0) +
      (t.gate ? 1 : 0),
    0
  ) + 1, // the capstone
  xp: tracks.reduce((n, t) => n + trackXp(t), 0) + capstone.xp,
};

/* ------------------------------------------- client-safe serialisation */

/**
 * Challenges carry their own answer keys, so they must be stripped before
 * being handed to a client component. Scoring happens on the server, which
 * reads from the unstripped source.
 */
export type ClientQuiz = {
  id: string;
  kind: "quiz" | "gate" | "capstone";
  title: string;
  blurb: string;
  passPercent: number;
  xp: number;
  /** Options are already in display order. The server maps them back when grading. */
  questions: { id: string; scenario?: string; prompt: string; options: string[] }[];
};

export type ClientSpotTheBug = {
  id: string;
  kind: "spot-the-bug";
  title: string;
  blurb: string;
  language: string;
  lines: string[];
  /** Already in display order. The server maps back when grading. */
  reasons: string[];
  xp: number;
};

export type ClientCodeChallenge = {
  id: string;
  kind: "code";
  title: string;
  blurb: string;
  functionName: string;
  starter: string;
  /** Visible tests — the learner's code runs against these in the browser. */
  tests: { name: string; args: unknown[]; expected: unknown }[];
  hints: string[];
  xp: number;
};

export type ClientChallenge =
  | ClientQuiz
  | ClientSpotTheBug
  | ClientCodeChallenge;

/**
 * Display order of each quiz question's options: `result[q][displayPosition]` is the
 * original option index. Deterministic, so serving and grading always agree.
 */
export function quizOrders(challenge: Quiz): number[][] {
  return balancedOrders(
    challenge.questions.map((q) => q.correctIndex),
    challenge.questions.map((q) => q.options.length),
    challenge.id
  );
}

/** Display order of a spot-the-bug challenge's reasons (`order[displayPosition] = original`). */
export function reasonOrder(challenge: Extract<Challenge, { kind: "spot-the-bug" }>): number[] {
  return balancedOrders([challenge.correctReasonIndex], [challenge.reasons.length], challenge.id)[0];
}

export function toClientChallenge(challenge: Challenge): ClientChallenge {
  switch (challenge.kind) {
    case "quiz":
    case "gate":
    case "capstone":
      return {
        id: challenge.id,
        kind: challenge.kind,
        title: challenge.title,
        blurb: challenge.blurb,
        passPercent: challenge.passPercent,
        xp: challenge.xp,
        questions: challenge.questions.map((q, qi) => ({
          id: q.id,
          scenario: q.scenario,
          prompt: q.prompt,
          options: quizOrders(challenge)[qi].map((i) => q.options[i]),
        })),
      };
    case "spot-the-bug": {
      const order = reasonOrder(challenge);
      return {
        id: challenge.id,
        kind: "spot-the-bug",
        title: challenge.title,
        blurb: challenge.blurb,
        language: challenge.language,
        lines: challenge.lines,
        reasons: order.map((i) => challenge.reasons[i]),
        xp: challenge.xp,
      };
    }
    case "code":
      return {
        id: challenge.id,
        kind: "code",
        title: challenge.title,
        blurb: challenge.blurb,
        functionName: challenge.functionName,
        starter: challenge.starter,
        tests: challenge.tests,
        hints: challenge.hints,
        xp: challenge.xp,
      };
  }
}
