"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

import type { ClientChallenge } from "@/content";

import { BugRunner } from "./BugRunner";
import { CodeRunner } from "./CodeRunner";
import { QuizRunner } from "./QuizRunner";

const KIND_LABEL: Record<ClientChallenge["kind"], string> = {
  quiz: "Quiz",
  gate: "Track gate",
  "spot-the-bug": "Spot the bug",
  code: "Code",
};

export function ChallengeRunner({
  challenge,
  signedIn,
  passed,
}: {
  challenge: ClientChallenge;
  signedIn: boolean;
  passed: boolean;
}) {
  const router = useRouter();
  // Refresh server components so progress, XP and locks update after a submit.
  const onDone = () => router.refresh();

  return (
    <section id={challenge.id} className="card scroll-mt-24 p-5 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="chip">{KIND_LABEL[challenge.kind]}</span>
            <span className="chip !border-amber/40 !text-amber">{challenge.xp} XP</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight">{challenge.title}</h3>
          <p className="mt-1 text-sm text-text-muted">{challenge.blurb}</p>
        </div>
        <span
          className={`flex items-center gap-1.5 text-sm ${passed ? "text-green" : "text-text-dim"}`}
        >
          {passed ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
          {passed ? "Passed" : "Not passed"}
        </span>
      </header>

      {challenge.kind === "code" ? (
        <CodeRunner challenge={challenge} signedIn={signedIn} onDone={onDone} />
      ) : challenge.kind === "spot-the-bug" ? (
        <BugRunner challenge={challenge} signedIn={signedIn} onDone={onDone} />
      ) : (
        <QuizRunner challenge={challenge} signedIn={signedIn} onDone={onDone} />
      )}
    </section>
  );
}
