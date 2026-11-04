"use client";

import { useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Play, XCircle } from "lucide-react";

import type { ClientCodeChallenge } from "@/content";

import { ResultBanner } from "./ResultBanner";
import { runTests, type TestOutcome } from "./runCode";
import { submitChallenge, type SubmitResult } from "./submit";

type ServerFeedback = { fatal?: string | null; outcomes?: { name: string; passed: boolean; error?: string }[] };

/** A short reason from the server's check: its fatal message, or the tests it failed. */
function serverReason(feedback: unknown): string {
  const f = (feedback ?? {}) as ServerFeedback;
  if (f.fatal) return `: ${f.fatal}`;
  const failed = (f.outcomes ?? []).filter((o) => !o.passed);
  if (failed.length === 0) return "";
  const first = failed[0];
  return `: ${failed.length} test${failed.length === 1 ? "" : "s"} failed, starting with "${first.name}"${first.error ? ` (${first.error})` : ""}`;
}

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
        // The code itself goes to the server, which runs it in a sandbox and decides. A pass count could be claimed by anyone.
        await submitChallenge(challenge.id, { code })
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
      {result && !result.passed && (
        <p role="alert" className="rounded-lg border border-border-strong bg-bg-raised px-3 py-2 text-sm text-text-muted">
          Our checker could not confirm this solution{serverReason(result.feedback)}. It runs your code in a stricter
          sandbox than your browser, so code that relies on browser-only features can pass above and still fail here. Fix
          it, run the tests again, and resubmit.
        </p>
      )}
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
