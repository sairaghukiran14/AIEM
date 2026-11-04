"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, RotateCcw, X } from "lucide-react";

import { seededOrder } from "@/lib/shuffle";
import type { PlacementQuestion } from "@/content/assessment";

type TrackInfo = { slug: string; order: number; title: string };

type Verdict = { label: string; hint: string };

function verdict(correct: number): Verdict {
  if (correct === 2) return { label: "Solid", hint: "You can skim this track and go straight to its gate." };
  if (correct === 1) return { label: "Shaky", hint: "Review the lessons you find hard, then take the gate." };
  return { label: "Start here", hint: "Work through this track from its first lesson." };
}

export function PlacementRunner({ questions, tracks }: { questions: PlacementQuestion[]; tracks: TrackInfo[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  // Fixed per question, so the correct option is not always in the same slot.
  const orders = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.id, seededOrder(q.options.length, `placement:${q.id}`)])),
    [questions]
  );

  const answered = Object.keys(answers).length;
  const perTrack = tracks.map((t) => {
    const qs = questions.filter((q) => q.track === t.slug);
    const correct = qs.filter((q) => {
      const shown = answers[q.id];
      return shown !== undefined && orders[q.id][shown] === q.correctIndex;
    }).length;
    return { track: t, total: qs.length, correct };
  });
  const firstWeak = perTrack.find((r) => r.total > 0 && r.correct < r.total);
  const startAt = perTrack.find((r) => r.total > 0 && r.correct <= Math.floor(r.total / 2));
  const score = perTrack.reduce((n, r) => n + r.correct, 0);

  function reset() {
    setAnswers({});
    setDone(false);
    window.scrollTo({ top: 0 });
  }

  if (done) {
    return (
      <div className="space-y-8">
        <section className="card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Your result</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {score} of {questions.length} correct
          </p>
          <p className="mt-3 text-text-muted">
            {startAt ? (
              <>
                Suggested starting point:{" "}
                <Link href={`/tracks/${startAt.track.slug}`} className="font-semibold text-text underline">
                  Track {startAt.track.order}: {startAt.track.title}
                </Link>
                . Earlier tracks looked solid, but each gate still has to be passed to unlock the next track.
              </>
            ) : firstWeak ? (
              <>
                You did well. The one area to tighten first is{" "}
                <Link href={`/tracks/${firstWeak.track.slug}`} className="font-semibold text-text underline">
                  Track {firstWeak.track.order}: {firstWeak.track.title}
                </Link>
                .
              </>
            ) : (
              <>Every answer was right. You can head to the gates, or straight to the capstone once they are passed.</>
            )}
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">By track</h2>
          <ul className="space-y-2">
            {perTrack.map(({ track, total, correct }) => {
              const v = verdict(correct);
              return (
                <li key={track.slug} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="mr-2 text-text-dim">{track.order}.</span>
                      {track.title}
                    </p>
                    <p className="text-sm text-text-muted">{v.hint}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="chip">{v.label}</span>
                    <span className="font-mono text-sm">
                      {correct}/{total}
                    </span>
                    <Link href={`/tracks/${track.slug}`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                      Open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Your answers</h2>
          <ol className="space-y-4">
            {questions.map((q, i) => {
              const shown = answers[q.id];
              const order = orders[q.id];
              const ok = shown !== undefined && order[shown] === q.correctIndex;
              return (
                <li key={q.id} className="rounded-lg border border-border-base p-4 text-sm">
                  <p className="flex items-start gap-2 font-medium">
                    {ok ? <Check className="mt-0.5 size-4 shrink-0" aria-label="correct" /> : <X className="mt-0.5 size-4 shrink-0" aria-label="incorrect" />}
                    <span>
                      <span className="mr-1 text-text-dim">{i + 1}.</span>
                      {q.prompt}
                    </span>
                  </p>
                  {!ok && (
                    <p className="mt-2 text-text-muted">
                      <span className="font-semibold text-text">Answer: </span>
                      {q.options[q.correctIndex]}
                    </p>
                  )}
                  <p className="mt-2 text-text-muted">{q.explanation}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex flex-wrap gap-3">
          <button className="btn btn-ghost" onClick={reset}>
            <RotateCcw className="size-4" /> Take it again
          </button>
          <Link href="/tracks" className="btn btn-primary">
            Go to the tracks
          </Link>
        </div>
        <p className="text-xs text-text-dim">
          This placement check is not scored or saved, and it does not unlock anything. Track locks still depend on passing each gate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ol className="space-y-6">
        {questions.map((q, qi) => (
          <li key={q.id}>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">
                <span className="mr-2 text-text-dim">{qi + 1}.</span>
                {q.prompt}
              </legend>
              {orders[q.id].map((original, oi) => (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    answers[q.id] === oi ? "border-2 border-text bg-bg-raised" : "border-border-base bg-bg hover:bg-bg-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name={`placement-${q.id}`}
                    checked={answers[q.id] === oi}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className="flex-1">{q.options[original]}</span>
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={answered < questions.length} onClick={() => { setDone(true); window.scrollTo({ top: 0 }); }}>
          See my result ({answered}/{questions.length} answered)
        </button>
        <span className="text-sm text-text-dim">Not sure? Pick your best guess. It only affects the suggestion.</span>
      </div>
    </div>
  );
}
