import "server-only";

import { getQuizQuestion, quizBank, quizCategories, type QuizKind } from "@/content/quiz";
import { rating, summarise, type Level, type ScoredItem, type Summary } from "@/lib/quiz-core";
import type { QuizAttemptDoc } from "@/models/QuizAttempt";

/** What the browser is allowed to know about one question. The right answer is only included once it is answered. */
export type QuestionView = {
  index: number;
  kind: QuizKind;
  difficulty: Level;
  category: string;
  prompt: string;
  options: string[];
  answered: boolean;
  chosen: number | null;
  correct: boolean | null;
  correctDisplay: number | null;
  explanation: string | null;
};

export type AttemptView = {
  id: string;
  total: number;
  answered: number;
  questions: QuestionView[];
};

const scored = (items: QuizAttemptDoc["items"]): ScoredItem[] =>
  items.map((it) => ({
    difficulty: it.difficulty as Level,
    kind: it.kind as QuizKind,
    category: it.category,
    correct: it.correct,
    answered: it.answered,
    skipped: it.answered && it.chosen === null,
  }));

export function attemptView(attempt: QuizAttemptDoc): AttemptView {
  const questions: QuestionView[] = attempt.items.map((it, index) => {
    const q = getQuizQuestion(it.questionId);
    const options = q ? it.order.map((original) => q.options[original]) : [];
    return {
      index,
      kind: it.kind as QuizKind,
      difficulty: it.difficulty as Level,
      category: it.category,
      prompt: q?.prompt ?? "This question has been removed from the bank.",
      options,
      answered: it.answered,
      chosen: it.answered ? it.chosen ?? null : null,
      correct: it.answered ? it.correct : null,
      correctDisplay: it.answered ? it.correctDisplay ?? null : null,
      explanation: it.answered ? q?.explanation ?? null : null,
    };
  });
  return {
    id: attempt._id.toString(),
    total: questions.length,
    answered: questions.filter((q) => q.answered).length,
    questions,
  };
}

export type ResultView = {
  summary: Summary;
  label: string;
  hint: string;
  categories: { slug: string; title: string; trackSlug?: string; correct: number; total: number }[];
  weakest: { slug: string; title: string; trackSlug?: string } | null;
};

export function resultView(attempt: QuizAttemptDoc): ResultView {
  const summary = summarise(scored(attempt.items));
  const { label, hint } = rating(summary.percent);
  const categories = Object.entries(summary.byCategory).map(([slug, t]) => {
    const cat = quizCategories.find((c) => c.slug === slug);
    return { slug, title: cat?.title ?? slug, trackSlug: cat?.trackSlug, correct: t.correct, total: t.total };
  });
  const weak = categories.filter((c) => c.total >= 2).sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  return { summary, label, hint, categories, weakest: weak && weak.correct < weak.total ? weak : null };
}

export const bankSize = quizBank.length;
