import { FastLink as Link } from "@/components/FastLink";
import type { Report } from "@/lib/interview-scorecard";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/live-interview-core";

const READINESS: Record<Report["readiness"], string> = {
  ready: "Ready for real interviews",
  nearly_ready: "Nearly ready",
  needs_practice: "Needs more practice",
  not_yet: "Not ready yet",
};

function Dots({ score }: { score: number }) {
  return (
    <span className="whitespace-nowrap font-mono text-xs" aria-label={`${score} out of 5`}>
      <span aria-hidden="true" className="tracking-[0.15em]">{"●".repeat(score)}{"○".repeat(5 - score)}</span> {score}/5
    </span>
  );
}

type PlanItem = { question: string; answer: string; difficulty: number; lessonTitle: string; trackSlug: string; lessonSlug: string };

export function Scorecard({ report, plan }: { report: Report; plan: PlanItem[] }) {
  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Your scorecard</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
          <p className="text-5xl font-semibold tracking-tight">{report.overallScore}</p>
          <p className="pb-1 text-text-muted">out of 100</p>
          <span className="chip mb-1 font-semibold">{READINESS[report.readiness]}</span>
        </div>
        {report.highestLevel !== undefined && (
          <p className="mt-3 text-sm">
            Hardest level you handled reliably:{" "}
            <span className="font-semibold">{report.highestLevel ? DIFFICULTY_LABEL[report.highestLevel] : "none yet"}</span>
            <span className="text-text-dim"> (an average of 3.5 out of 5 or better). Hard questions count three times as much as easy ones in your score.</span>
          </p>
        )}
        <p className="mt-3 leading-relaxed">{report.summary}</p>
        <p className="mt-3 text-xs text-text-dim">Written by AI from your transcript. Use it for practice, not as a prediction of a hiring decision.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">How you did</h2>
          <ul className="space-y-3">
            {report.dimensions.map((d) => (
              <li key={d.name} className="text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{d.name}</span>
                  <Dots score={d.score} />
                </div>
                <p className="mt-0.5 text-text-muted">{d.evidence}</p>
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-6">
          <section className="card space-y-2 p-5">
            <h2 className="text-lg font-semibold">What to do next</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {report.nextSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
          <section className="card space-y-1 p-5 text-sm">
            <h2 className="mb-1 text-lg font-semibold">Your speaking</h2>
            <p>Answers given: <span className="font-medium">{report.stats.answers}</span></p>
            {report.stats.wordsPerMinute !== null && <p>Pace: <span className="font-medium">{report.stats.wordsPerMinute} words a minute</span> <span className="text-text-dim">(including thinking pauses)</span></p>}
            {report.stats.averageAnswerSeconds !== null && <p>Average answer: <span className="font-medium">{report.stats.averageAnswerSeconds} seconds</span></p>}
          </section>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Question by question</h2>
        <ol className="space-y-4">
          {report.questions.map((q) => {
            const item = plan[q.questionIndex];
            return (
              <li key={q.questionIndex} className="card space-y-3 p-5 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium">{item?.question}</p>
                  {item && <span className="chip">{DIFFICULTY_LABEL[(item.difficulty || 2) as Difficulty]}</span>}
                  <Dots score={q.score} />
                </div>
                {q.quote && <blockquote className="border-l-2 border-text-dim pl-3 italic text-text-muted">&ldquo;{q.quote}&rdquo;</blockquote>}
                <p><span className="font-semibold">What went well: </span>{q.wentWell}</p>
                <p><span className="font-semibold">What you missed: </span>{q.missed}</p>
                <div className="rounded-lg bg-bg-raised p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-dim">A stronger answer</p>
                  <p>{q.strongerAnswer ?? item?.answer}</p>
                </div>
                {item && (
                  <Link href={`/learn/${item.trackSlug}/${item.lessonSlug}`} className="inline-block font-medium underline">
                    Revise: {item.lessonTitle}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
