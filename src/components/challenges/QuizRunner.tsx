"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import type { ClientQuiz } from "@/content";

import { ResultSkeleton } from "@/components/Skeleton";

import { ResultBanner } from "./ResultBanner";
import { submitChallenge, type SubmitResult } from "./submit";
import { useDraft } from "./useDraft";

type QuestionFeedback = {
  questionId: string;
  correct: boolean;
  /** Absent on a failed gate or capstone, which keep the key hidden. */
  correctIndex?: number;
  explanation?: string;
};

export function QuizRunner({
  challenge,
  signedIn,
  signInHref,
  onDone,
}: {
  challenge: ClientQuiz;
  signedIn: boolean;
  signInHref: string;
  onDone: () => void;
}) {
  const blank = useMemo<(number | null)[]>(() => challenge.questions.map(() => null), [challenge.questions]);
  const [saved, setAnswers, clearAnswers] = useDraft(`aiem:answers:${challenge.id}`, blank);
  // A draft saved before the questions changed no longer lines up, so it is ignored.
  const answers = saved.length === blank.length ? saved : blank;
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The draft is cleared on submit, so the graded result keeps its own copy of what was chosen.
  const [submitted, setSubmitted] = useState<(number | null)[]>(blank);
  const shown = result ? submitted : answers;

  const feedback = result
    ? new Map(
        (result.feedback as { results: QuestionFeedback[] }).results.map((r) => [r.questionId, r])
      )
    : null;
  const answered = answers.filter((a) => a !== null).length;

  async function submit() {
    setPending(true);
    setError(null);
    setSubmitted(answers);
    try {
      setResult(await submitChallenge(challenge.id, answers));
      clearAnswers();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  function retry() {
    setResult(null);
    setSubmitted(blank);
  }

  return (
    <div className="space-y-6">
      {challenge.questions.map((q, qi) => {
        const fb = feedback?.get(q.id);
        // A case study is shown once, above the first question that uses it.
        const showScenario = Boolean(q.scenario) && q.scenario !== challenge.questions[qi - 1]?.scenario;
        return (
          <div key={q.id} className="space-y-4">
            {showScenario && (
              <div className="whitespace-pre-line rounded-xl border-2 border-text bg-bg-raised p-4 text-sm leading-relaxed">
                {q.scenario}
              </div>
            )}
          <fieldset disabled={Boolean(result)} className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              <span className="mr-2 text-text-dim">{qi + 1}.</span>
              {q.prompt}
            </legend>
            {q.options.map((opt, oi) => {
              // Positions here are display positions; the server translates them.
              const chosen = shown[qi] === oi;
              const isCorrect = fb && (oi === fb.correctIndex || (fb.correct && chosen));
              const isWrongChoice = fb && chosen && !fb.correct;
              return (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    isCorrect
                      ? "border-2 border-text bg-bg-raised"
                      : isWrongChoice
                        ? "border-dashed border-text-dim bg-bg text-text-muted"
                        : chosen
                          ? "border-accent bg-accent-dim/50"
                          : "border-border-base bg-bg hover:bg-bg-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${challenge.id}-${q.id}`}
                    checked={chosen}
                    onChange={() => setAnswers(answers.map((v, i) => (i === qi ? oi : v)))}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className="flex-1">{opt}</span>
                  {isCorrect && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                      <Check className="size-3.5" /> Correct
                    </span>
                  )}
                  {isWrongChoice && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                      <X className="size-3.5" /> Your answer</span>
                  )}
                </label>
              );
            })}
            {fb?.explanation && (
              <p className="rounded-lg bg-bg-raised px-3 py-2 text-sm text-text-muted">
                {fb.explanation}
              </p>
            )}
          </fieldset>
          </div>
        );
      })}

      {pending && <ResultSkeleton />}
      {result && <ResultBanner result={result} passPercent={challenge.passPercent} />}
      {error && (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      )}

      {!signedIn ? (
        <a href={signInHref} className="btn btn-primary">
          Sign in to submit
        </a>
      ) : result ? (
        <button className="btn btn-ghost" onClick={retry}>
          {result.passed ? "Try again" : "Retry"}
        </button>
      ) : (
        <button
          className="btn btn-primary"
          disabled={pending || answered < challenge.questions.length}
          onClick={submit}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Submit ({answered}/{challenge.questions.length} answered)
        </button>
      )}
    </div>
  );
}
