/** Rules of the live interview. Pure, so they can be tested without a server, a microphone or any API. */

export type Phase = "warmup" | "technical" | "closing" | "ended";
export type Cursor = { phase: Phase; index: number; followUps: number; hints: number };
/** What the decision model may choose after a technical answer. */
export type Action = "follow_up" | "probe_gap" | "hint" | "move_on" | "repeat" | "end";
export type Directive = "ask_question" | "follow_up" | "probe_gap" | "hint" | "rephrase" | "closing" | "goodbye";
export type Difficulty = 1 | 2 | 3;

export const MAX_FOLLOW_UPS = 2;
export const MAX_HINTS = 1;
export const LENGTHS = [3, 10, 15, 20] as const;

/** Easy questions get one follow-up, so a long interview stays near 50 minutes. */
export const followUpLimit = (difficulty: Difficulty) => (difficulty === 1 ? 1 : MAX_FOLLOW_UPS);

/** A hard stop on turns, so one interview cannot run up an unlimited bill. */
export const maxTurns = (questions: number) => questions * 6 + 10;
export const MAX_ANSWER_CHARS = 6000;
export const MAX_SPOKEN_CHARS = 900;

export const ACTION_CRITERIA: Record<Action, string> = {
  follow_up: "The answer is reasonable and touches the main idea, so a deeper follow-up would test real understanding.",
  probe_gap: "The answer has a clear gap or mistake compared with the reference answer, and the candidate should be pressed on it.",
  hint: "The candidate is stuck, says they do not know, or gave almost nothing, and a small nudge could help.",
  move_on: "The answer is thorough, or further questions on this topic would add little.",
  repeat: "The candidate asked for the question to be repeated, clarified or explained.",
  end: "The candidate clearly asked to stop the interview now.",
};

export function startCursor(): Cursor {
  return { phase: "warmup", index: 0, followUps: 0, hints: 0 };
}

const atQuestion = (index: number): Cursor => ({ phase: "technical", index, followUps: 0, hints: 0 });

function moveOn(cursor: Cursor, total: number): { cursor: Cursor; directive: Directive } {
  const index = cursor.index + 1;
  if (index < total) return { cursor: atQuestion(index), directive: "ask_question" };
  return { cursor: { ...cursor, phase: "closing" }, directive: "closing" };
}

/** Limits are enforced here, so a model's choice can never make an interview loop forever. */
export function nextStep(cursor: Cursor, action: Action, total: number, followUps = MAX_FOLLOW_UPS): { cursor: Cursor; directive: Directive } {
  if (cursor.phase === "ended") return { cursor, directive: "goodbye" };
  if (cursor.phase === "closing" || action === "end") return { cursor: { ...cursor, phase: "ended" }, directive: "goodbye" };
  if (cursor.phase === "warmup") return { cursor: atQuestion(0), directive: "ask_question" };

  switch (action) {
    case "repeat":
      return { cursor, directive: "rephrase" };
    case "hint":
      if (cursor.hints >= MAX_HINTS) return moveOn(cursor, total);
      return { cursor: { ...cursor, hints: cursor.hints + 1 }, directive: "hint" };
    case "follow_up":
    case "probe_gap":
      if (cursor.followUps >= followUps) return moveOn(cursor, total);
      return { cursor: { ...cursor, followUps: cursor.followUps + 1 }, directive: action };
    default:
      return moveOn(cursor, total);
  }
}

/** The choice to use when the decision model cannot be reached, so the interview keeps going. */
export function fallbackAction(answer: string, cursor: Cursor): Action {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  if (words < 12 && cursor.hints < MAX_HINTS) return "hint";
  return cursor.followUps === 0 ? "follow_up" : "move_on";
}

/** Only a plain request to stop counts. "Ignore your instructions" must not be able to end an interview. */
export function wantsToStop(answer: string): boolean {
  if (answer.trim().split(/\s+/).length > 25) return false;
  return /\b(stop|end|finish|quit|wrap up)\b[^.?!]*\b(interview|here|now|this|it)\b|\b(can|could|let'?s|let us|i want to|i'?d like to)\b[^.?!]*\b(stop|end|finish|quit)\b/i.test(answer);
}

/** The likeliest move the decision model allows, ignoring "end" unless the candidate really asked to stop. */
export function pickAction(probabilities: Record<string, number>, answer: string): Action | null {
  const ranked = Object.entries(probabilities).sort((a, b) => b[1] - a[1]).map(([action]) => action);
  for (const action of ranked) {
    if (!(action in ACTION_CRITERIA)) continue;
    if (action === "end" && !wantsToStop(answer)) continue;
    return action as Action;
  }
  return null;
}

/** Text for a voice to read: no reasoning tags, no markdown, and short enough to sound like speech. */
export function cleanSpoken(text: string): string {
  const plain = text
    .replace(/<think>[\s\S]*?<\/think>/gi, " ")
    .replace(/<think>[\s\S]*$/i, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= MAX_SPOKEN_CHARS) return plain;
  const cut = plain.slice(0, MAX_SPOKEN_CHARS);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return end > 0 ? cut.slice(0, end + 1) : cut;
}

/** The line to speak when the conversation model cannot be reached. Nothing here reveals the answer. */
export function scriptedLine(directive: Directive, question: { question: string; followUp?: string } | null): string {
  const q = question?.question ?? "";
  switch (directive) {
    case "ask_question":
      return `Thanks. Let's move on. ${q}`;
    case "follow_up":
      return question?.followUp ?? "Can you go one level deeper on that, and give me a concrete example?";
    case "probe_gap":
      return "I want to press on that a little. What would go wrong in production if you built it exactly that way?";
    case "hint":
      return "Take your time. Start with what you do know, and think about what happens step by step.";
    case "rephrase":
      return `Sure, here it is again. ${q}`;
    case "closing":
      return "That's all my technical questions. Do you have a question for me about the role or the team?";
    case "goodbye":
      return "Thanks for your time today. That's the end of the interview.";
  }
}

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, Number.isFinite(n) ? n : low));
export const clampScore = (n: number) => Math.round(clamp(n, 1, 5));
export const clampPercent = (n: number) => Math.round(clamp(n, 0, 100));

/** Speaking pace and length, measured rather than judged by a model. */
export function speakingStats(answers: { text: string; seconds?: number | null }[]) {
  const timed = answers.filter((a) => a.seconds && a.seconds > 0);
  const words = timed.reduce((n, a) => n + a.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const seconds = timed.reduce((n, a) => n + (a.seconds ?? 0), 0);
  return {
    answers: answers.length,
    wordsPerMinute: seconds > 0 ? Math.round((words / seconds) * 60) : null,
    averageAnswerSeconds: timed.length ? Math.round(seconds / timed.length) : null,
  };
}

/* ------------------------------------------------------------------ difficulty and rounds */

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

export function startDifficulty(level: string): Difficulty {
  return level === "junior" ? 1 : level === "senior" ? 3 : 2;
}

/** Answer quality is Prism's 0-3 rating, averaged over the answers to one question. Strong moves up, weak moves down. */
export function nextDifficulty(current: Difficulty, quality: number | null): Difficulty {
  if (quality === null) return current;
  if (quality >= 2.2) return Math.min(3, current + 1) as Difficulty;
  if (quality <= 1) return Math.max(1, current - 1) as Difficulty;
  return current;
}

export const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/** Long interviews run in rounds with a pause between them, as a real interview loop does. */
export function roundsFor(total: number): number {
  return total >= 15 ? 3 : total >= 10 ? 2 : 1;
}
export function roundOf(index: number, total: number): number {
  return Math.floor(index / Math.ceil(total / roundsFor(total))) + 1;
}
export function isRoundStart(index: number, total: number): boolean {
  return index > 0 && roundOf(index, total) !== roundOf(index - 1, total);
}

type Candidate = { id: string; lessonSlug: string; trackSlug: string; difficulty: Difficulty };

/**
 * The next question: the asked-for level if possible, otherwise the nearest one, never a lesson already used, and
 * preferably from a different track than the last question.
 */
export function chooseQuestion<T extends Candidate>(pool: T[], used: Candidate[], difficulty: Difficulty, random = Math.random): T | null {
  const lessons = new Set(used.map((q) => q.lessonSlug));
  const lastTrack = used.at(-1)?.trackSlug;
  const open = pool.filter((q) => !lessons.has(q.lessonSlug));
  if (open.length === 0) return null;
  const rank = (q: T) => Math.abs(q.difficulty - difficulty) * 10 + (q.trackSlug === lastTrack ? 1 : 0);
  const best = Math.min(...open.map(rank));
  const choices = open.filter((q) => rank(q) === best);
  return choices[Math.floor(random() * choices.length)] ?? null;
}

/** Short spoken links between questions. Chosen by question id, so each question's line is always the same and its audio can be reused. */
const LINKS = ["Okay, thanks. Next question.", "Thanks. Let's move on.", "Alright. Here's the next one.", "Okay. Let's switch topics."];
export function askLine(question: { id: string; question: string }, round: number | null): string {
  let h = 0;
  for (const c of question.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const lead = round ? `Let's start round ${round}.` : LINKS[h % LINKS.length];
  return cleanSpoken(`${lead} ${question.question}`);
}

/** The overall score, with hard questions counting three times as much as easy ones. Scores are 1-5. */
export function weightedScore(items: { score: number; difficulty: Difficulty }[]): number {
  const weight = items.reduce((n, q) => n + q.difficulty, 0);
  if (weight === 0) return 0;
  return clampPercent((items.reduce((n, q) => n + ((clampScore(q.score) - 1) / 4) * q.difficulty, 0) / weight) * 100);
}

/** The hardest level where the candidate averaged at least 3.5 out of 5. */
export function highestReliableLevel(items: { score: number; difficulty: Difficulty }[]): Difficulty | null {
  for (const level of [3, 2, 1] as Difficulty[]) {
    const scores = items.filter((q) => q.difficulty === level).map((q) => q.score);
    const avg = mean(scores);
    if (avg !== null && avg >= 3.5) return level;
  }
  return null;
}

export function readinessFor(score: number): "ready" | "nearly_ready" | "needs_practice" | "not_yet" {
  return score >= 75 ? "ready" : score >= 55 ? "nearly_ready" : score >= 35 ? "needs_practice" : "not_yet";
}
