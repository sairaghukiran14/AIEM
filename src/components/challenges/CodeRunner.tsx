"use client";

import { useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Play, XCircle } from "lucide-react";

import type { ClientCodeChallenge } from "@/content";

import { ResultBanner } from "./ResultBanner";
import { runTests, type TestOutcome } from "./runCode";
import { submitChallenge, type SubmitResult } from "./submit";

export function CodeRunner({
  challenge,
  signedIn,
  onDone,
}: {
  challenge: ClientCodeChallenge;
  signedIn: boolean;
  onDone: () => void;
}) {
  const [code, setCode] = useState(challenge.starter);
  const [outcomes, setOutcomes] = useState<TestOutcome[] | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passedCount = outcomes?.filter((o) => o.passed).length ?? 0;
  const allPassed = outcomes !== null && passedCount === challenge.tests.length;

  async function run() {
    setRunning(true);
    setFatal(null);
    setResult(null);
    const res = await runTests(code, challenge.functionName, challenge.tests);
    setOutcomes(res.outcomes.length ? res.outcomes : null);
    setFatal(res.fatal ?? null);
    setRunning(false);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      setResult(
        await submitChallenge(challenge.id, {
          passedTests: passedCount,
          totalTests: challenge.tests.length,
        })
      );
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        aria-label="Code editor"
        className="input min-h-72 resize-y font-mono text-[13px] leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const t = e.currentTarget;
            const { selectionStart: s, selectionEnd: end } = t;
            setCode(code.slice(0, s) + "  " + code.slice(end));
            requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={run} disabled={running}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Run tests
        </button>
        <button
          className="btn btn-ghost"
          disabled={hintsShown >= challenge.hints.length}
          onClick={() => setHintsShown((n) => n + 1)}
        >
          <Lightbulb className="size-4" /> Hint ({hintsShown}/{challenge.hints.length})
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setCode(challenge.starter);
            setOutcomes(null);
            setFatal(null);
          }}
        >
          Reset
        </button>
      </div>

      {hintsShown > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-amber/40 bg-amber/5 p-3 text-sm text-text-muted">
          {challenge.hints.slice(0, hintsShown).map((h, i) => (
            <li key={i}>
              <span className="mr-2 text-amber">Hint {i + 1}.</span>
              {h}
            </li>
          ))}
        </ul>
      )}

      {fatal && (
        <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 font-mono text-sm text-red">
          {fatal}
        </p>
      )}

      {outcomes && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            {passedCount}/{challenge.tests.length} tests passing
          </p>
          {outcomes.map((o, i) => (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2 text-sm ${
                o.passed
                  ? "border-text bg-bg-raised"
                  : "border-dashed border-text-dim bg-bg"
              }`}
            >
              <div className="flex items-center gap-2">
                {o.passed ? (
                  <CheckCircle2 className="size-4 shrink-0 text-green" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-red" />
                )}
                {o.name}
              </div>
              {!o.passed && (
                <div className="mt-1 pl-6 font-mono text-xs text-text-muted">
                  {o.error ? (
                    <>error: {o.error}</>
                  ) : (
                    <>
                      expected {JSON.stringify(o.expected)} · got {JSON.stringify(o.got)}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {result && <ResultBanner result={result} />}
      {error && (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      )}

      {allPassed && !result && (
        signedIn ? (
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Submit solution
          </button>
        ) : (
          <a href="/login" className="btn btn-primary">
            Sign in to submit
          </a>
        )
      )}
    </div>
  );
}
