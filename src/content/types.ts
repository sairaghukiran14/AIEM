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
  | SorterBlock
  | PredictBlock
  | ExampleBlock
  | CompareBlock;

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

/** Commit to an answer before seeing it: a short question with instant feedback. Practice only. */
export type PredictBlock = {
  type: "predict";
  title: string;
  prompt: string;
  /** Optional snippet, prompt or log shown above the options. */
  code?: string;
  options: string[];
  answer: number;
  why: string;
};

/** A worked example: a problem, then its solution revealed one step at a time. */
export type ExampleBlock = {
  type: "example";
  title: string;
  problem: string;
  steps: { do: string; result: string }[];
  takeaway: string;
};

/** Two versions of the same thing; pick the better one, then see why. Practice only. */
export type CompareBlock = {
  type: "compare";
  title: string;
  prompt: string;
  a: { label: string; text: string };
  b: { label: string; text: string };
  /** 0 for a, 1 for b. */
  better: 0 | 1;
  why: string;
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
  /**
   * Optional shared context (a case study). Consecutive questions with the same
   * `scenario` are shown under it once, so a long exam can follow one story.
   */
  scenario?: string;
  prompt: string;
  options: string[];
  /** Index into `options`. Never sent to the browser before submission. */
  correctIndex: number;
  explanation: string;
};

export type Quiz = {
  id: string;
  /** "capstone" is the final course assessment, which sits outside any track. */
  kind: "quiz" | "gate" | "capstone";
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
  /** Section 3 — worked example. Helpers it calls may be left undefined. `javascript` is merged in from content/code-js. */
  codeExample: { language: string; code: string; caption?: string; javascript?: string };
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
