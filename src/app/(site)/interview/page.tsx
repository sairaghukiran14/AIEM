import Link from "next/link";

import { InterviewRunner } from "@/components/interview/InterviewRunner";
import { tracks } from "@/content";
import { pickQuestions, questionCount } from "@/lib/interview";

export const metadata = { title: "Mock interview" };

type Props = { searchParams: Promise<{ track?: string; n?: string; round?: string }> };

export default async function InterviewPage({ searchParams }: Props) {
  const { track, n, round } = await searchParams;
  const valid = track === "mixed" || tracks.some((t) => t.slug === track);

  if (track && valid) {
    const count = n === "10" ? 10 : 5;
    const questions = pickQuestions(track, count);
    const label = track === "mixed" ? "Mixed, all tracks" : (tracks.find((t) => t.slug === track)?.title ?? track);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Mock interview</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{label}</h1>
        </header>
        {/* The round key restarts the session when the same set is requested again. */}
        <InterviewRunner key={`${track}-${count}-${round ?? "0"}`} questions={questions} track={track} count={count} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Practice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Mock interview</h1>
        <p className="mt-3 text-lg text-text-muted">
          Reading an answer is not the same as giving one. Here you answer from memory, in your own words, then compare
          with a strong answer and rate yourself honestly.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-text-muted">
          <li>Read the question and write the answer you would say out loud. Aim for about a minute.</li>
          <li>Reveal the strong answer, with the key terms you used and the ones you missed.</li>
          <li>Rate yourself. At the end you get the lessons to revisit.</li>
        </ol>
        <p className="mt-3 text-sm text-text-dim">
          There is no automatic grading. The key-term check only shows word overlap, and your own rating is what counts.
          Nothing is scored or saved.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Choose a set</h2>
        <ul className="space-y-2">
          <li className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">Mixed: all tracks</p>
              <p className="text-sm text-text-muted">{questionCount("mixed")} questions to draw from</p>
            </div>
            <div className="flex gap-2">
              <Link href="/interview?track=mixed&n=5" className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                5 questions
              </Link>
              <Link href="/interview?track=mixed&n=10" className="btn btn-primary !px-3 !py-1.5 !text-xs">
                10 questions
              </Link>
            </div>
          </li>
          {tracks.map((t) => (
            <li key={t.slug} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="mr-2 text-text-dim">{t.order}.</span>
                  {t.title}
                </p>
                <p className="text-sm text-text-muted">{questionCount(t.slug)} questions to draw from</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/interview?track=${t.slug}&n=5`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                  5 questions
                </Link>
                <Link href={`/interview?track=${t.slug}&n=10`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                  10 questions
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
