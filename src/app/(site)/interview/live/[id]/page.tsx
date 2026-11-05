import { FastLink as Link } from "@/components/FastLink";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";

import { DeleteInterview } from "@/components/interview/DeleteInterview";
import { LiveRoom } from "@/components/interview/LiveRoom";
import { Scorecard } from "@/components/interview/Scorecard";
import { requireUser } from "@/lib/auth";
import { roundOf, roundsFor } from "@/lib/live-interview-core";
import { connectDB } from "@/lib/db";
import type { Report } from "@/lib/interview-scorecard";
import { VOICES, type VoiceId } from "@/lib/sarvam";
import { LiveInterview } from "@/models/LiveInterview";

export const metadata = { title: "Live voice interview" };

type Props = { params: Promise<{ id: string }> };

export default async function LiveInterviewRoomPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/interview/live/${id}`);
  if (!isValidObjectId(id)) notFound();

  await connectDB();
  const interview = await LiveInterview.findOne({ _id: id, userId: user.id }).lean();
  if (!interview) notFound();

  const name = VOICES[interview.voice as VoiceId].name;

  if (interview.status === "done") {
    // The interview is over, so the reference answers can be shown as the strong answers.
    const plan = interview.plan.map((p) => ({ question: p.question ?? "", answer: p.answer ?? "", difficulty: p.difficulty ?? 2, lessonTitle: p.lessonTitle ?? "", trackSlug: p.trackSlug ?? "", lessonSlug: p.lessonSlug ?? "" }));
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Interview with {name}</h1>
        {interview.report ? (
          <Scorecard report={interview.report as Report} plan={plan} />
        ) : (
          <p className="card p-5 text-sm">This interview ended before you answered a technical question, so there is nothing to mark.</p>
        )}

        <details className="card p-5 text-sm">
          <summary className="cursor-pointer font-semibold">Full transcript</summary>
          <ol className="mt-3 space-y-2">
            {interview.turns.map((t, i) => (
              <li key={i}><span className="font-semibold">{t.role === "candidate" ? "You" : name}: </span>{t.text}</li>
            ))}
          </ol>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/interview/live" className="btn btn-primary">Practise again</Link>
          <DeleteInterview id={id} />
        </div>
      </div>
    );
  }

  // Only the words already said go to the browser. The reference answers stay on the server.
  const lastLine = [...interview.turns].reverse().find((t) => t.role === "interviewer")?.text ?? "";
  const cursor = interview.cursor;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Interview with {name}</h1>
      <LiveRoom
        id={id}
        interviewerName={name}
        firstLine={lastLine}
        turnCount={interview.turns.length}
        initialProgress={{
          phase: cursor?.phase ?? "warmup",
          index: cursor?.index ?? 0,
          total: interview.target,
          round: roundOf(cursor?.index ?? 0, interview.target),
          rounds: roundsFor(interview.target),
        }}
        ended={interview.status !== "active"}
      />
    </div>
  );
}
