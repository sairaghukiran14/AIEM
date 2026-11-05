import { notFound, redirect } from "next/navigation";

import { FastLink as Link } from "@/components/FastLink";
import { QuizResults } from "@/components/quiz/QuizResults";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { attemptView, resultView } from "@/lib/quiz";
import { QuizAttempt } from "@/models/QuizAttempt";

export const metadata = { title: "Quiz result" };

export default async function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/.test(id)) notFound();
  const user = await requireUser(`/quiz/attempt/${id}`);

  await connectDB();
  const attempt = await QuizAttempt.findOne({ _id: id, userId: user.id }).lean();
  if (!attempt) notFound();
  if (attempt.status !== "done") redirect("/quiz");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Quiz result</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">How you did</h1>
      </header>
      <QuizResults
        result={resultView(attempt)}
        review={attemptView(attempt).questions}
        again={
          <>
            <Link href="/quiz" className="btn btn-primary">Take another quiz</Link>
            <Link href="/tracks" className="btn btn-ghost">Go to the tracks</Link>
          </>
        }
      />
    </div>
  );
}
