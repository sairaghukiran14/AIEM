"use client";

import { useEffect, useMemo, useState } from "react";
import { FastLink as Link } from "@/components/FastLink";
import { announceNavigation } from "@/components/NavigationFeedback";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, RotateCcw } from "lucide-react";

import { coverage, keyTerms } from "@/lib/interview-terms";
import type { MockQuestion } from "@/lib/interview";

type Rating = 0 | 1 | 2;

const RATINGS: { value: Rating; label: string }[] = [
  { value: 0, label: "Missed the key points" },
  { value: 1, label: "Partly there" },
  { value: 2, label: "Covered it well" },
];

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Counts up from zero while 'running'. It is remounted for each question, so it restarts itself. */
function Stopwatch({ running }: { running: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return (
    <span className="font-mono" aria-label="time on this question">
      {clock(seconds)}
    </span>
  );
}

export function InterviewRunner({ questions, track, count }: { questions: MockQuestion[]; track: string; count: number }) {
  const [index, setIndex] = useState(0);
  const [texts, setTexts] = useState<string[]>(() => questions.map(() => ""));
  const [revealed, setRevealed] = useState<boolean[]>(() => questions.map(() => false));
  const [ratings, setRatings] = useState<(Rating | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);
  const router = useRouter();

  const q = questions[index];
  const text = texts[index];
  const isRevealed = revealed[index];

  const terms = useMemo(() => keyTerms(q.answer), [q.answer]);
  const cover = useMemo(() => coverage(text, terms), [text, terms]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const rated = ratings.filter((r) => r !== null).length;
  const score = ratings.reduce<number>((n, r) => n + (r ?? 0), 0);

  function setText(value: string) {
    setTexts((t) => t.map((v, i) => (i === index ? value : v)));
  }
  function rate(value: Rating) {
    setRatings((r) => r.map((v, i) => (i === index ? value : v)));
  }
  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      window.scrollTo({ top: 0 });
    } else {
      setIndex(index + 1);
    }
  }

  if (finished) {
    const revisit = questions.filter((_, i) => (ratings[i] ?? 0) < 2);
    const lessons = [...new Map(revisit.map((x) => [x.lessonSlug, x])).values()];
    return (
      <div className="space-y-8">
        <section className="card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Session summary</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {score} of {questions.length * 2} self-rating points
          </p>
          <p className="mt-2 text-text-muted">
            {ratings.filter((r) => r === 2).length} covered well, {ratings.filter((r) => r === 1).length} partly, {ratings.filter((r) => r === 0).length} missed.
            Your rating is the measure here, so be strict with yourself.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Lessons to revisit</h2>
          {lessons.length === 0 ? (
            <p className="text-sm text-text-muted">You rated every answer as well covered. Try a longer set or a different track.</p>
          ) : (
            <ul className="space-y-2">
              {lessons.map((l) => (
                <li key={l.lessonSlug} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{l.lessonTitle}</p>
                    <p className="text-sm text-text-muted">{l.trackTitle}</p>
                  </div>
                  <Link href={`/learn/${l.trackSlug}/${l.lessonSlug}#interview`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                    Open lesson
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            className="btn btn-primary"
            onClick={() => {
              const href = `/interview?track=${track}&n=${count}&round=${Date.now()}`;
              announceNavigation(href);
              router.push(href);
            }}
          >
            <RotateCcw className="size-4" /> New set
          </button>
          <Link href="/interview" className="btn btn-ghost">
            Choose another track
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-dim">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <Stopwatch key={index} running={!isRevealed} />
      </div>

      <div className="card space-y-4 p-4 sm:p-5">
        <p className="text-xs text-text-dim">
          {q.trackTitle} &middot; {q.lessonTitle}
        </p>
        <p className="text-lg font-semibold leading-snug">{q.question}</p>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Your answer, as you would say it out loud</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isRevealed}
            aria-label="Your answer"
            placeholder="Start with the direct answer, then explain why, then give an example or trade-off."
            className="input min-h-40 resize-y text-sm leading-relaxed"
          />
          <span className="mt-1 block text-xs text-text-dim">{words} words. A spoken minute is about 120 to 160.</span>
        </label>

        {!isRevealed && (
          <button
            className="btn btn-primary"
            onClick={() => setRevealed((r) => r.map((v, i) => (i === index ? true : v)))}
          >
            <Eye className="size-4" /> Compare with a strong answer
          </button>
        )}
      </div>

      {isRevealed && (
        <div className="space-y-4">
          <section className="card space-y-3 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">A strong answer</p>
            <p className="text-sm leading-relaxed">{q.answer}</p>
            {q.followUp && (
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text">Likely follow-up: </span>
                {q.followUp}
              </p>
            )}
          </section>

          <section className="card space-y-3 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">Key terms: word overlap, not a grade</p>
            {words === 0 ? (
              <p className="text-sm text-text-muted">You did not write an answer, so none of the key terms were used.</p>
            ) : (
              <p className="text-sm text-text-muted">
                You used {cover.used.length} of {terms.length} distinctive terms ({cover.percent}%). Missing a word is fine if you said the idea another way.
              </p>
            )}
            <ul className="flex flex-wrap gap-1.5">
              {terms.map((t) => {
                const used = cover.used.includes(t);
                return (
                  <li
                    key={t}
                    className={`chip ${used ? "!border-2 !border-text !font-semibold" : "!border-dashed"}`}
                    title={used ? "you mentioned this" : "not in your answer"}
                  >
                    {used && <Check className="size-3" aria-label="used" />} {t}
                  </li>
                );
              })}
            </ul>
          </section>

          {q.weakAnswer && (
            <section className="card space-y-2 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">A common shallow answer</p>
              <p className="text-sm leading-relaxed text-text-muted">{q.weakAnswer}</p>
            </section>
          )}

          <section className="card space-y-3 p-4 sm:p-5">
            <p className="text-sm font-medium">How did your answer compare?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Rate your answer">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => rate(r.value)}
                  aria-pressed={ratings[index] === r.value}
                  className={`btn ${ratings[index] === r.value ? "btn-primary" : "btn-ghost"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div>
              <button className="btn btn-primary" disabled={ratings[index] === null} onClick={next}>
                {index + 1 >= questions.length ? "Finish" : "Next question"} <ArrowRight className="size-4" />
              </button>
              <span className="ml-3 text-xs text-text-dim">
                {rated}/{questions.length} rated
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
