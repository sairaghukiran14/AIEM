/**
 * Content schema for the whole course.
 *
 * Lessons are plain typed data rather than MDX so that every lesson is forced
 * into the same five-section shape, and so challenges can be scored on the
 * server from the same source the page renders.
 */

export type Level = "beginner" | "intermediate" | "advanced";

/* ------------------------------------------------------------------ blocks */

/** Inline text supports `code` and **bold**; see renderInline(). */
export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | {
      type: "callout";
      tone: "info" | "warn" | "key" | "interview";
      title: string;
      text: string;
    }
  | { type: "code"; language: string; code: string; caption?: string }
  | { type: "visual"; key: VisualKey; caption?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "quote"; text: string; attribution?: string }
  | StepperBlock
  | CalculatorBlock
  | SorterBlock;

/** Step-through animation: move forward and back through states of a process. */
export type StepperBlock = {
  type: "stepper";
  title: string;
  caption?: string;
  steps: {
    label: string;
    detail: string;
    /** Chips shown for this step, e.g. tokens, documents or graph nodes. */
    items?: string[];
    /** Indices into `items` to highlight as the thing that changed. */
    mark?: number[];
  }[];
};

/**
 * Sliders feeding live formulas. Formulas are JS expressions over the input keys
 * (Math.* is available). They are authored in this repo, never from user input.
 */
export type CalculatorBlock = {
  type: "calculator";
  title: string;
  caption?: string;
  inputs: { key: string; label: string; min: number; max: number; step: number; value: number; unit?: string }[];
  outputs: { label: string; formula: string; format?: "int" | "usd" | "pct" | "fixed1" | "fixed2" | "ms" }[];
  note?: string;
};

/** Practice exercise: put each item in a category, then check. Not scored or stored. */
export type SorterBlock = {
  type: "sorter";
  title: string;
  prompt: string;
  caption?: string;
  categories: string[];
  items: { text: string; answer: number; why: string }[];
};

/** Keys into the animated-visual registry (src/components/visuals). */
export type VisualKey =
  | "next-token-predictor"
  | "tokenizer"
  | "context-window"
  | "sampling-dial"
  | "attention-grid"
  | "model-picker"
  | "prompt-anatomy"
  | "few-shot-builder"
  | "cot-cost"
  | "schema-validator"
  | "trust-boundary"
  | "regression-matrix"
  | "embedding-space"
  | "rag-pipeline"
  | "agent-loop";

/* -------------------------------------------------------------- challenges */

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  /** Index into `options`. Never sent to the browser before submission. */
  correctIndex: number;
  explanation: string;
};

export type Quiz = {
  id: string;
  kind: "quiz" | "gate";
  title: string;
  blurb: string;
  passPercent: number;
  xp: number;
  questions: QuizQuestion[];
};

export type SpotTheBug = {
  id: string;
  kind: "spot-the-bug";
  title: string;
  blurb: string;
  language: string;
  /** One entry per line, without line numbers. */
  lines: string[];
  /** 1-based line number that holds the bug. */
  buggyLine: number;
  /** Multiple-choice explanations of *why* that line is wrong. */
  reasons: string[];
  correctReasonIndex: number;
  explanation: string;
  fix: string;
  xp: number;
};

export type CodeTest = {
  name: string;
  /** Arguments applied to the learner's exported function. */
  args: unknown[];
  expected: unknown;
};

export type CodeChallenge = {
  id: string;
  kind: "code";
  title: string;
  blurb: string;
  /** Function the learner must define; tests call it by this name. */
  functionName: string;
  starter: string;
  tests: CodeTest[];
  hints: string[];
  solution: string;
  xp: number;
};

export type Challenge = Quiz | SpotTheBug | CodeChallenge;

/* ------------------------------------------------------------------ lesson */

export type InterviewQA = {
  question: string;
  /** A strong, concise answer — what you would actually say out loud. */
  answer: string;
  /** The common shallow answer, so learners can hear the difference. */
  weakAnswer?: string;
  followUp?: string;
};

export type Lesson = {
  slug: string;
  order: number;
  title: string;
  summary: string;
  minutes: number;
  /** Section 1 — the idea, with its animated visual. */
  concept: Block[];
  /** Section 2 — the mechanism interviewers probe. */
  underTheHood: Block[];
  /** Section 3 — runnable example. */
  codeExample: { language: string; code: string; caption?: string };
  /** Section 4 — interview corner. */
  interview: InterviewQA[];
  /** Section 5 — scored challenges, in the order they are shown. */
  challenges: Challenge[];
};

/* ------------------------------------------------------------- cheatsheets */

export type CheatsheetSection = {
  heading: string;
  items: { term: string; detail: string }[];
};

/* ------------------------------------------------------------------- track */

export type Track = {
  slug: string;
  order: number;
  title: string;
  tagline: string;
  description: string;
  level: Level;
  /** lucide-react icon name, resolved by the icon registry. */
  icon: string;
  accentVar: string;
  interviewTopics: string[];
  lessons: Lesson[];
  /** The track gate: pass it to unlock the next track. */
  gate: Quiz | null;
  cheatsheet: CheatsheetSection[];
  published: boolean;
};
