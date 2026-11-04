"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import type { ClientSpotTheBug } from "@/content";

import { ResultSkeleton } from "@/components/Skeleton";

import { ResultBanner } from "./ResultBanner";
import { submitChallenge, type SubmitResult } from "./submit";

type BugFeedback = {
  lineOk: boolean;
  reasonOk: boolean;
  buggyLine: number;
  correctReasonIndex: number;
  explanation: string;
  fix: string;
};

export function BugRunner({
  challenge,
  signedIn,
  onDone,
}: {
  challenge: ClientSpotTheBug;
  signedIn: boolean;
  onDone: () => void;
}) {
  const [line, setLine] = useState<number | null>(null);
  const [reason, setReason] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fb = result?.feedback as BugFeedback | undefined;

  async function submit() {
    setPending(true);
    setError(null);
    try {
      setResult(await submitChallenge(challenge.id, { line, reason }));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">1. Click the buggy line</p>
        <div className="overflow-x-auto rounded-xl border border-border-base bg-bg py-2 font-mono text-[13px]">
          {challenge.lines.map((text, i) => {
            const n = i + 1;
            const selected = line === n;
            const isBug = fb && n === fb.buggyLine;
            return (
              <button
                key={n}
                type="button"
                disabled={Boolean(result) || text.trim() === ""}
                onClick={() => setLine(n)}
                className={`flex w-full items-start gap-4 px-3 py-0.5 text-left transition-colors ${
                  isBug
                    ? "border-l-2 border-text bg-bg-hover font-semibold"
                    : fb && selected
                      ? "border-l-2 border-dashed border-text-dim bg-bg-raised"
                      : selected
                        ? "bg-accent-dim"
                        : "hover:bg-bg-hover"
                }`}
              >
                <span className="w-5 shrink-0 select-none text-right text-text-dim">{n}</span>
                <span className="whitespace-pre text-text">{text || " "}</span>
                {isBug && (
                  <span className="ml-auto flex shrink-0 items-center gap-1 pr-1 text-[11px] font-semibold uppercase tracking-wide">
                    <Check className="size-3" /> Bug
                  </span>
                )}
                {fb && selected && !isBug && (
                  <span className="ml-auto flex shrink-0 items-center gap-1 pr-1 text-[11px] uppercase tracking-wide text-text-muted">
                    <X className="size-3" /> Your pick
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset disabled={Boolean(result)} className="space-y-2">
        <legend className="mb-2 text-sm font-medium">2. Why is it wrong?</legend>
        {challenge.reasons.map((r, i) => {
          const chosen = reason === i;
          const isCorrect = fb && i === fb.correctReasonIndex;
          const isWrong = fb && chosen && !fb.reasonOk;
          return (
            <label
              key={i}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                isCorrect
                  ? "border-2 border-text bg-bg-raised"
                  : isWrong
                    ? "border-dashed border-text-dim bg-bg text-text-muted"
                    : chosen
                      ? "border-accent bg-accent-dim/50"
                      : "border-border-base bg-bg hover:bg-bg-hover"
              }`}
            >
              <input
                type="radio"
                name={challenge.id}
                checked={chosen}
                onChange={() => setReason(i)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span className="flex-1">{r}</span>
              {isCorrect && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                  <Check className="size-3.5" /> Correct
                </span>
              )}
              {isWrong && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                  <X className="size-3.5" /> Your answer
                </span>
              )}
            </label>
          );
        })}
      </fieldset>

      {pending && <ResultSkeleton />}
      {result && <ResultBanner result={result} />}
      {fb && (
        <div className="space-y-3 rounded-xl border border-border-base bg-bg-raised p-4 text-sm">
          <p className="text-text-muted">{fb.explanation}</p>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-text-dim">Fix</p>
            <pre className="overflow-x-auto rounded-lg bg-bg p-3 font-mono text-[13px]">
              <code>{fb.fix}</code>
            </pre>
          </div>
        </div>
      )}
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
        <button
          className="btn btn-ghost"
          onClick={() => {
            setResult(null);
            setLine(null);
            setReason(null);
          }}
        >
          Try again
        </button>
      ) : (
        <button
          className="btn btn-primary"
          disabled={pending || line === null || reason === null}
          onClick={submit}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Submit
        </button>
      )}
    </div>
  );
}
