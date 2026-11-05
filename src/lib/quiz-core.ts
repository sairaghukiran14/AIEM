/** Pure rules for the quiz: choosing questions, shuffling, scoring and rating. No database, so they are easy to test. */
import { balancedOrders } from "@/lib/shuffle";

export type Level = 1 | 2 | 3;
export type Kind = "concept" | "decision" | "debug" | "yesno";

export type BankEntry = { id: string; category: string; kind: Kind; difficulty: Level; options: string[]; correctIndex: number };

export type Filters = {
  category: string; // a category slug or "all"
  difficulty: "mixed" | "1" | "2" | "3";
  kind: Kind | "all";
  count: number;
};

export const COUNTS = [10, 20, 30, 50] as const;
export const POINTS: Record<Level, number> = { 1: 1, 2: 2, 3: 3 };

/** Shuffles a list with the given random source (Fisher-Yates). */
export function shuffled<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks the question ids for one attempt. Questions the learner has not seen recently come first. With "mixed" the
 * picks are spread across the three levels and the quiz runs from easy to hard; otherwise the order is random.
 */
export function pickQuestionIds(bank: BankEntry[], f: Filters, seen: Set<string>, rand: () => number): string[] {
  const pool = bank.filter(
    (q) => (f.category === "all" || q.category === f.category) && (f.kind === "all" || q.kind === f.kind) && (f.difficulty === "mixed" || q.difficulty === Number(f.difficulty))
  );
  const fresh = (list: BankEntry[]) => {
    const unseen = shuffled(list.filter((q) => !seen.has(q.id)), rand);
    const old = shuffled(list.filter((q) => seen.has(q.id)), rand);
    return [...unseen, ...old];
  };
  const want = Math.min(f.count, pool.length);
  if (f.difficulty !== "mixed") return fresh(pool).slice(0, want).map((q) => q.id);

  // About 30% easy, 40% medium, 30% hard, topped up from whatever level has questions left.
  const levels: Level[] = [1, 2, 3];
  const byLevel = new Map(levels.map((l) => [l, fresh(pool.filter((q) => q.difficulty === l))]));
  const share: Record<Level, number> = { 1: Math.round(want * 0.3), 2: Math.round(want * 0.4), 3: 0 };
  share[3] = want - share[1] - share[2];
  const chosen: BankEntry[] = [];
  for (const l of levels) chosen.push(...byLevel.get(l)!.splice(0, share[l]));
  for (const l of [2, 3, 1] as Level[]) {
    while (chosen.length < want && byLevel.get(l)!.length) chosen.push(byLevel.get(l)!.shift()!);
  }
  return chosen
    .sort((a, b) => a.difficulty - b.difficulty || rand() - 0.5)
    .map((q) => q.id);
}

/**
 * The display order of each question's options, `order[position] = original index`. Yes/no keeps Yes first. Multiple
 * choice is shuffled so the correct answer is spread evenly over the positions within one attempt.
 */
export function displayOrders(questions: BankEntry[], seed: string): number[][] {
  const mc = questions.filter((q) => q.kind !== "yesno");
  const mcOrders = balancedOrders(mc.map((q) => q.correctIndex), mc.map((q) => q.options.length), seed);
  let next = 0;
  return questions.map((q) => (q.kind === "yesno" ? [0, 1] : mcOrders[next++]));
}

/** Grades one choice. `chosen` is a display position, or null for a skip. */
export function gradeChoice(order: number[], correctIndex: number, chosen: number | null): { correct: boolean; correctDisplay: number } {
  const correctDisplay = order.indexOf(correctIndex);
  const valid = chosen !== null && Number.isInteger(chosen) && chosen >= 0 && chosen < order.length;
  return { correct: valid && order[chosen as number] === correctIndex, correctDisplay };
}

export type ScoredItem = { difficulty: Level; kind: Kind; category: string; correct: boolean; answered: boolean; skipped?: boolean };

export type Tally = { total: number; correct: number };

export type Summary = {
  score: number;
  maxScore: number;
  percent: number;
  correct: number;
  total: number;
  skipped: number;
  byLevel: Record<Level, Tally>;
  byKind: Record<Kind, Tally>;
  byCategory: Record<string, Tally>;
};

export function summarise(items: ScoredItem[]): Summary {
  const empty = (): Tally => ({ total: 0, correct: 0 });
  const s: Summary = {
    score: 0, maxScore: 0, percent: 0, correct: 0, total: items.length, skipped: 0,
    byLevel: { 1: empty(), 2: empty(), 3: empty() },
    byKind: { concept: empty(), decision: empty(), debug: empty(), yesno: empty() },
    byCategory: {},
  };
  for (const it of items) {
    const pts = POINTS[it.difficulty];
    s.maxScore += pts;
    s.byLevel[it.difficulty].total++;
    s.byKind[it.kind].total++;
    (s.byCategory[it.category] ??= empty()).total++;
    if (it.skipped) s.skipped++;
    if (it.correct) {
      s.score += pts;
      s.correct++;
      s.byLevel[it.difficulty].correct++;
      s.byKind[it.kind].correct++;
      s.byCategory[it.category].correct++;
    }
  }
  s.percent = s.maxScore ? Math.round((s.score / s.maxScore) * 100) : 0;
  return s;
}

export function rating(percent: number): { label: string; hint: string } {
  if (percent >= 90) return { label: "Expert", hint: "You would hold your own in a senior interview on these topics." };
  if (percent >= 75) return { label: "Strong", hint: "Solid judgement. The hard questions are where the last points are." };
  if (percent >= 60) return { label: "Competent", hint: "You know the ground. Review the explanations for what you missed." };
  if (percent >= 40) return { label: "Developing", hint: "Some gaps. Work through the matching track, then try again." };
  return { label: "Early stage", hint: "Start with the fundamentals track and come back." };
}
