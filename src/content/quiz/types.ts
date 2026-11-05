export type QuizKind = "concept" | "decision" | "debug" | "yesno";
export type Difficulty = 1 | 2 | 3;

/** A question as written in the bank. For multiple choice the correct option comes first; the quiz shuffles it. */
export type Draft = {
  kind: QuizKind;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type QuizQuestion = Draft & {
  /** `<category>-<position in its file>`. Append new questions to the end of a file so ids stay stable. */
  id: string;
  category: string;
};

export type QuizCategory = {
  slug: string;
  title: string;
  blurb: string;
  /** The track that teaches it, if there is one. */
  trackSlug?: string;
};

export const KIND_LABEL: Record<QuizKind, string> = {
  concept: "Concept",
  decision: "Decision",
  debug: "Debugging",
  yesno: "Yes or no",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };
