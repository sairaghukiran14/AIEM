"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, SkipForward, X } from "lucide-react";

import { FastLink as Link } from "@/components/FastLink";
import { KindBadge, LevelBadge } from "@/components/quiz/QuizResults";
import type { AttemptView, QuestionView } from "@/lib/quiz";

type Category = { slug: string; title: string; blurb: string; count: number };
export type QuizStats = {
  attempts: number;
  best: number | null;
  average: number | null;
  mastered: number;
  bank: number;
  recent: { id: string; percent: number; score: number; maxScore: number; total: number; when: string; label: string }[];
};

const LEVELS = [
  { value: "mixed", label: "Mixed, easy to hard" },
  { value: "1", label: "Easy only" },
  { value: "2", label: "Medium only" },
  { value: "3", label: "Hard only" },
];
const KINDS = [
  { value: "all", label: "All types" },
  { value: "concept", label: "Concept" },
  { value: "decision", label: "Decision making" },
  { value: "debug", label: "Debugging" },
  { value: "yesno", label: "Yes or no" },
];
const COUNTS = [10, 20, 30, 50];

function Choice<T extends string | number>({ legend, value, onChange, options }: { legend: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${value === o.value ? "border-2 border-text bg-bg-raised font-semibold" : "border-border-base bg-bg hover:bg-bg-hover"}`}>
            <input type="radio" className="sr-only" name={legend} checked={value === o.value} onChange={() => onChange(o.value)} />
            {value === o.value && <Check className="mr-1 inline size-3.5" aria-hidden="true" />}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Runner({ initial, onExit }: { initial: AttemptView; onExit: () => void }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionView[]>(initial.questions);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const firstOpen = questions.findIndex((q) => !q.answered);
  const [viewing, setViewing] = useState<number>(firstOpen === -1 ? questions.length - 1 : firstOpen);
  const q = questions[viewing];
  const answeredCount = questions.filter((x) => x.answered).length;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [viewing]);

  const submit = useCallback(
    async (choice: number | null) => {
      if (!q || q.answered || pending) return;
      setPending(true);
      setError(null);
      try {
        const res = await fetch("/api/quiz/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ attemptId: initial.id, index: q.index, choice }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not save that answer");
          return;
        }
        setQuestions((qs) =>
          qs.map((x) => (x.index === q.index ? { ...x, answered: true, chosen: choice, correct: data.correct, correctDisplay: data.correctDisplay, explanation: data.explanation } : x))
        );
        if (data.finished) setFinished(true);
      } catch {
        setError("Network problem. Try that answer again.");
      } finally {
        setPending(false);
      }
    },
    [q, pending, initial.id]
  );

  function next() {
    if (finished) {
      router.push(`/quiz/attempt/${initial.id}`);
      return;
    }
    const nextOpen = questions.findIndex((x, i) => !x.answered && i !== viewing);
    if (nextOpen !== -1) {
      setPicked(null);
      setError(null);
      setViewing(nextOpen);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || !q) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (!q.answered) {
        const n = "1234".indexOf(e.key) !== -1 ? Number(e.key) - 1 : "abcd".indexOf(e.key.toLowerCase());
        if (n >= 0 && n < q.options.length) setPicked(n);
        if (e.key === "Enter" && picked !== null) void submit(picked);
      } else if (e.key === "Enter" || e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q) return null;
  const pct = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-text-muted">
          <span>Question {viewing + 1} of {questions.length}</span>
          <button className="text-xs underline hover:text-text" onClick={onExit}>Leave the quiz</button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-border-base bg-bg" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} aria-label="Questions answered">
          <div className="h-full bg-text transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="q-title">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={q.kind} />
          <LevelBadge level={q.difficulty} />
        </div>
        <h2 id="q-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold leading-snug outline-none sm:text-xl">{q.prompt}</h2>

        <div role="radiogroup" aria-labelledby="q-title" className="space-y-2">
          {q.options.map((o, i) => {
            const right = q.answered && i === q.correctDisplay;
            const mine = q.answered && i === q.chosen;
            const selected = !q.answered && picked === i;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected || mine}
                disabled={q.answered || pending}
                onClick={() => setPicked(i)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  right ? "border-2 border-text bg-bg-raised" : mine ? "border-2 border-dashed border-text" : selected ? "border-2 border-text bg-bg-raised" : "border-border-base bg-bg hover:bg-bg-hover"
                } ${q.answered ? "cursor-default" : ""}`}
              >
                <span className="mt-0.5 w-4 shrink-0 font-mono text-xs text-text-dim">{q.kind === "yesno" ? "" : String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{o}</span>
                {right && <span className="chip shrink-0"><Check className="size-3.5" aria-hidden="true" /> Correct answer</span>}
                {mine && !right && <span className="chip shrink-0"><X className="size-3.5" aria-hidden="true" /> Your answer</span>}
              </button>
            );
          })}
        </div>

        {error && <p role="alert" className="text-sm font-medium">{error}</p>}

        {!q.answered ? (
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={picked === null || pending} onClick={() => submit(picked)}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Check answer
            </button>
            <button className="btn btn-ghost" disabled={pending} onClick={() => submit(null)}>
              <SkipForward className="size-4" aria-hidden="true" /> Skip
            </button>
            <span className="hidden text-xs text-text-dim sm:inline">Keys: 1-4 or A-D to choose, Enter to check</span>
          </div>
        ) : (
          <div className="space-y-3" aria-live="polite">
            <p className="flex items-center gap-2 font-semibold">
              {q.chosen === null ? <><SkipForward className="size-4" aria-hidden="true" /> Skipped</> : q.correct ? <><Check className="size-4" aria-hidden="true" /> Correct</> : <><X className="size-4" aria-hidden="true" /> Not quite</>}
            </p>
            {q.explanation && <p className="text-sm text-text-muted">{q.explanation}</p>}
            <button className="btn btn-primary" onClick={next}>
              {finished ? "See my score" : "Next question"} <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export function QuizApp({ signedIn, categories, stats, resume }: { signedIn: boolean; categories: Category[]; stats: QuizStats | null; resume: AttemptView | null }) {
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("mixed");
  const [kind, setKind] = useState("all");
  const [count, setCount] = useState(20);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, difficulty, kind, count }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Could not start the quiz");
      setAttempt(data.attempt);
      window.scrollTo({ top: 0 });
    } catch {
      setError("Network problem. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (attempt) return <Runner key={attempt.id} initial={attempt} onExit={() => setAttempt(null)} />;

  return (
    <div className="space-y-8">
      {resume && (
        <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-semibold">You have a quiz in progress</p>
            <p className="text-sm text-text-muted">{resume.answered} of {resume.total} answered. Starting a new quiz replaces it.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setAttempt(resume)}>Continue</button>
        </section>
      )}

      {stats && stats.attempts > 0 && (
        <section className="grid gap-3 sm:grid-cols-4" aria-label="Your progress">
          {[
            ["Quizzes taken", String(stats.attempts)],
            ["Best score", stats.best === null ? "-" : `${stats.best}%`],
            ["Average", stats.average === null ? "-" : `${stats.average}%`],
            ["Questions mastered", `${stats.mastered} of ${stats.bank}`],
          ].map(([k, v]) => (
            <div key={k} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">{k}</p>
              <p className="mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </section>
      )}

      <section className="card space-y-6 p-5 sm:p-6" aria-labelledby="setup">
        <h2 id="setup" className="text-lg font-semibold">Build a quiz</h2>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Topic</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ slug: "all", title: "Everything", blurb: "A mix from every topic", count: categories.reduce((n, c) => n + c.count, 0) }, ...categories].map((c) => (
              <label key={c.slug} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${category === c.slug ? "border-2 border-text bg-bg-raised" : "border-border-base bg-bg hover:bg-bg-hover"}`}>
                <input type="radio" name="topic" className="mt-1 accent-[var(--accent)]" checked={category === c.slug} onChange={() => setCategory(c.slug)} />
                <span>
                  <span className="font-medium">{c.title}</span>
                  <span className="ml-2 text-xs text-text-dim">{c.count} questions</span>
                  <span className="block text-xs text-text-muted">{c.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Choice legend="Difficulty" value={difficulty} onChange={setDifficulty} options={LEVELS} />
        <Choice legend="Question type" value={kind} onChange={setKind} options={KINDS} />
        <Choice legend="Length" value={count} onChange={setCount} options={COUNTS.map((n) => ({ value: n, label: `${n} questions` }))} />

        {error && <p role="alert" className="text-sm font-medium">{error}</p>}
        {signedIn ? (
          <button className="btn btn-primary" disabled={pending} onClick={start}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Start the quiz
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login?next=/quiz" className="btn btn-primary">Sign in to start</Link>
            <Link href="/signup?next=/quiz" className="btn btn-ghost">Create an account</Link>
            <span className="text-sm text-text-muted">Your scores are saved to your account.</span>
          </div>
        )}
      </section>

      {stats && stats.recent.length > 0 && (
        <section aria-labelledby="recent">
          <h2 id="recent" className="mb-3 text-lg font-semibold">Recent quizzes</h2>
          <ul className="space-y-2">
            {stats.recent.map((r) => (
              <li key={r.id}>
                <Link href={`/quiz/attempt/${r.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-bg-hover">
                  <span className="text-sm text-text-muted">{r.when} · {r.total} questions</span>
                  <span className="flex items-center gap-3">
                    <span className="chip">{r.label}</span>
                    <span className="font-mono text-sm">{r.score}/{r.maxScore}</span>
                    <span className="font-semibold">{r.percent}%</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
