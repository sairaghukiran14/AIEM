import { Bug, BookOpen, Check, CircleHelp, Scale, X } from "lucide-react";

import { FastLink as Link } from "@/components/FastLink";
import { DIFFICULTY_LABEL, KIND_LABEL, type QuizKind } from "@/content/quiz/types";
import type { QuestionView, ResultView } from "@/lib/quiz";
import type { Level } from "@/lib/quiz-core";

export const KIND_ICON: Record<QuizKind, typeof Bug> = { concept: BookOpen, decision: Scale, debug: Bug, yesno: CircleHelp };

export function KindBadge({ kind }: { kind: QuizKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className="chip">
      <Icon className="size-3.5" aria-hidden="true" /> {KIND_LABEL[kind]}
    </span>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  return (
    <span className="chip" title={`${DIFFICULTY_LABEL[level]}: ${level} point${level > 1 ? "s" : ""}`}>
      <span aria-hidden="true" className="tracking-[0.2em]">{"●".repeat(level)}{"○".repeat(3 - level)}</span> {DIFFICULTY_LABEL[level]}
    </span>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full border border-border-base bg-bg" role="img" aria-label={`${pct}%`}>
      <div className="h-full bg-text" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Row({ label, correct, total }: { label: string; correct: number; total: number }) {
  if (total === 0) return null;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
      <span className="truncate">{label}</span>
      <span className="font-mono text-xs">{correct}/{total}</span>
      <span className="col-span-2"><Bar value={correct} max={total} /></span>
    </li>
  );
}

/** The score, a breakdown, and a review of every question with its explanation. No hooks, so the server can render it. */
export function QuizResults({ result, review, again }: { result: ResultView; review: QuestionView[]; again?: React.ReactNode }) {
  const { summary: s } = result;
  return (
    <div className="space-y-8">
      <section className="card p-5 sm:p-6" aria-labelledby="score">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Your score</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p id="score" className="text-5xl font-semibold tracking-tight">{s.percent}%</p>
          <p className="pb-1 text-text-muted">
            {s.score} of {s.maxScore} points · {s.correct} of {s.total} correct{s.skipped ? ` · ${s.skipped} skipped` : ""}
          </p>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2">
          <span className="chip font-semibold">{result.label}</span>
          <span className="text-text-muted">{result.hint}</span>
        </p>
        <p className="mt-3 text-xs text-text-dim">Easy questions are worth 1 point, medium 2 and hard 3. A skipped question scores 0.</p>
        {again && <div className="mt-5 flex flex-wrap gap-3">{again}</div>}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">By difficulty</h2>
          <ul className="space-y-3">
            {([1, 2, 3] as Level[]).map((l) => <Row key={l} label={DIFFICULTY_LABEL[l]} correct={s.byLevel[l].correct} total={s.byLevel[l].total} />)}
          </ul>
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">By question type</h2>
          <ul className="space-y-3">
            {(Object.keys(KIND_LABEL) as QuizKind[]).map((k) => <Row key={k} label={KIND_LABEL[k]} correct={s.byKind[k].correct} total={s.byKind[k].total} />)}
          </ul>
        </section>
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">By topic</h2>
        <ul className="space-y-3">
          {result.categories.map((c) => <Row key={c.slug} label={c.title} correct={c.correct} total={c.total} />)}
        </ul>
        {result.weakest && (
          <p className="pt-2 text-sm text-text-muted">
            Weakest topic: <span className="font-semibold text-text">{result.weakest.title}</span>.{" "}
            {result.weakest.trackSlug && (
              <Link href={`/tracks/${result.weakest.trackSlug}`} className="font-semibold text-text underline">
                Review the matching track
              </Link>
            )}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Review</h2>
        <ol className="space-y-4">
          {review.map((q) => (
            <li key={q.index} className="rounded-lg border border-border-base p-4 text-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {q.correct ? <Check className="size-4" aria-label="correct" /> : <X className="size-4" aria-label="incorrect" />}
                <span className="font-semibold">{q.chosen === null ? "Skipped" : q.correct ? "Correct" : "Incorrect"}</span>
                <KindBadge kind={q.kind} />
                <LevelBadge level={q.difficulty} />
              </div>
              <p className="font-medium"><span className="mr-1 text-text-dim">{q.index + 1}.</span>{q.prompt}</p>
              <ul className="mt-2 space-y-1.5">
                {q.options.map((o, i) => {
                  const right = i === q.correctDisplay;
                  const mine = i === q.chosen;
                  return (
                    <li key={i} className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 ${right ? "border-2 border-text" : mine ? "border-dashed border-text-dim" : "border-border-base"}`}>
                      <span className="mt-0.5 shrink-0 font-mono text-xs text-text-dim">{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1">{o}</span>
                      {right && <span className="chip shrink-0">Correct answer</span>}
                      {mine && !right && <span className="chip shrink-0">Your answer</span>}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && <p className="mt-2 text-text-muted">{q.explanation}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
