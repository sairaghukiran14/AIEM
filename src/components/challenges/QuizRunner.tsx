"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import type { ClientQuiz } from "@/content";

import { ResultBanner } from "./ResultBanner";
import { submitChallenge, type SubmitResult } from "./submit";

type QuestionFeedback = {
  questionId: string;
  correct: boolean;
  correctIndex: number;
  explanation: string;
};

export function QuizRunner({
  challenge,
  signedIn,
  onDone,
}: {
  challenge: ClientQuiz;
  signedIn: boolean;
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => challenge.questions.map(() => null)
  );
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const feedback = result
    ? new Map(
        (result.feedback as { results: QuestionFeedback[] }).results.map((r) => [r.questionId, r])
      )
    : null;
  const answered = answers.filter((a) => a !== null).length;

  async function submit() {
    setPending(true);
    setError(null);
    try {
      setResult(await submitChallenge(challenge.id, answers));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers(challenge.questions.map(() => null));
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
              const chosen = answers[qi] === oi;
              const isCorrect = fb && oi === fb.correctIndex;
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
                    onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
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
            {fb && (
              <p className="rounded-lg bg-bg-raised px-3 py-2 text-sm text-text-muted">
                {fb.explanation}
              </p>
            )}
          </fieldset>
          </div>
        );
      })}

      {result && <ResultBanner result={result} passPercent={challenge.passPercent} />}
      {error && (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      )}

      {!signedIn ? (
        <a href="/login" className="btn btn-primary">
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
