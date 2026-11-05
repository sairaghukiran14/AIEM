import type { Difficulty, Draft } from "./types";

/**
 * Short constructors for writing the bank. For c, d and b the first option after the prompt is the CORRECT one; the
 * quiz shuffles the options for each attempt, so its position here does not matter.
 *
 *   c(level, prompt, correct, wrong1, wrong2, wrong3, why)   a concept question
 *   d(level, prompt, correct, wrong1, wrong2, wrong3, why)   a decision: pick the best course of action
 *   b(level, prompt, correct, wrong1, wrong2, wrong3, why)   debugging: find the cause or the fix
 *   y(level, prompt, answer, why)                            yes or no
 */
const choice = (kind: "concept" | "decision" | "debug") =>
  (difficulty: Difficulty, prompt: string, correct: string, w1: string, w2: string, w3: string, explanation: string): Draft => ({
    kind,
    difficulty,
    prompt,
    options: [correct, w1, w2, w3],
    correctIndex: 0,
    explanation,
  });

export const c = choice("concept");
export const d = choice("decision");
export const b = choice("debug");

export const y = (difficulty: Difficulty, prompt: string, answer: boolean, explanation: string): Draft => ({
  kind: "yesno",
  difficulty,
  prompt,
  options: ["Yes", "No"],
  correctIndex: answer ? 0 : 1,
  explanation,
});
