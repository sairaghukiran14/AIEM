import Link from "next/link";
import { Award, CheckCircle2, Trophy, XCircle } from "lucide-react";

import type { SubmitResult } from "./submit";

export function ResultBanner({ result, passPercent }: { result: SubmitResult; passPercent?: number }) {
  const pct = Math.round((result.score / result.maxScore) * 100);

  return (
    <div
      role="status"
      className={`rounded-xl border p-4 ${
        result.passed
          ? "border-2 border-text bg-bg-raised"
          : "border border-dashed border-text-dim bg-bg"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        {result.passed ? (
          <CheckCircle2 className="size-5 text-green" />
        ) : (
          <XCircle className="size-5 text-red" />
        )}
        {result.passed ? "Passed" : "Not yet"} — {result.score}/{result.maxScore} ({pct}%)
        {!result.passed && passPercent ? (
          <span className="text-sm font-normal text-text-muted">· need {passPercent}%</span>
        ) : null}
      </div>

      <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-text-muted">
        <span>Attempt {result.attempt}</span>
        {result.xpAwarded > 0 ? (
          <span className="text-amber">+{result.xpAwarded} XP</span>
        ) : result.passed ? (
          <span>XP already earned for this one</span>
        ) : null}
      </div>

      {result.lessonCompleted && (
        <p className="mt-2 flex items-center gap-2 text-sm text-green">
          <Trophy className="size-4" /> Lesson complete — all challenges passed.
        </p>
      )}
      {result.trackCompleted && (
        <p className="mt-2 flex items-center gap-2 text-sm text-green">
          <Trophy className="size-4" /> Track complete! The next track is unlocked.
        </p>
      )}
      {result.capstoneCompleted && (
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4" /> Capstone complete!
        </p>
      )}
      {result.certificates?.map((c) => (
        <p key={c.certId} className="mt-2 flex flex-wrap items-center gap-x-2 text-sm font-semibold">
          <Award className="size-4" />
          {c.kind === "course" ? "Course certificate earned" : "Certificate earned"}: {c.title}
          <Link href={`/verify/${c.certId}`} className="font-medium underline">
            View and download
          </Link>
        </p>
      ))}
    </div>
  );
}
