import { NextResponse } from "next/server";
import { z } from "zod";

import { getQuizQuestion } from "@/content/quiz";
import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resultView } from "@/lib/quiz";
import { gradeChoice } from "@/lib/quiz-core";
import { limited, POLICIES } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/read-json";
import { QuizAttempt } from "@/models/QuizAttempt";

const KEEP_DAYS = 365;

const Body = z.object({
  attemptId: z.string().regex(/^[0-9a-f]{24}$/, "Unknown quiz"),
  index: z.number().int().min(0).max(99),
  /** A display position, or null to skip. */
  choice: z.number().int().min(0).max(3).nullable(),
});

export async function POST(request: Request) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to take the quiz" }, { status: 401 });

  const read = await readJsonBody(request, 1000);
  if (!read.ok) return read.response;
  const parsed = Body.safeParse(read.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid answer" }, { status: 400 });
  const { attemptId, index, choice } = parsed.data;

  try {
    const blocked = await limited(request, [{ policy: POLICIES.quizAnswerUser, id: userId }]);
    if (blocked) return blocked;
    await connectDB();

    const attempt = await QuizAttempt.findOne({ _id: attemptId, userId, status: "open" }).lean();
    if (!attempt) return NextResponse.json({ error: "This quiz is finished or no longer exists" }, { status: 404 });
    const item = attempt.items[index];
    if (!item) return NextResponse.json({ error: "No such question" }, { status: 400 });
    if (item.answered) return NextResponse.json({ error: "That question was already answered" }, { status: 409 });
    if (choice !== null && choice >= item.order.length) return NextResponse.json({ error: "No such option" }, { status: 400 });

    const q = getQuizQuestion(item.questionId);
    if (!q) return NextResponse.json({ error: "That question is no longer available" }, { status: 410 });
    const { correct, correctDisplay } = gradeChoice(item.order, q.correctIndex, choice);

    // The filter makes the write one-shot: two simultaneous answers cannot both be recorded.
    const written = await QuizAttempt.updateOne(
      { _id: attemptId, userId, status: "open", [`items.${index}.answered`]: false },
      { $set: { [`items.${index}.answered`]: true, [`items.${index}.chosen`]: choice, [`items.${index}.correct`]: correct, [`items.${index}.correctDisplay`]: correctDisplay } }
    );
    if (written.modifiedCount === 0) return NextResponse.json({ error: "That question was already answered" }, { status: 409 });

    const after = await QuizAttempt.findById(attemptId).lean();
    let finished = false;
    let result = null;
    if (after && after.items.every((i) => i.answered)) {
      const view = resultView(after);
      const done = await QuizAttempt.updateOne(
        { _id: attemptId, status: "open" },
        {
          $set: {
            status: "done",
            score: view.summary.score,
            maxScore: view.summary.maxScore,
            percent: view.summary.percent,
            correctCount: view.summary.correct,
            finishedAt: new Date(),
            expiresAt: new Date(Date.now() + KEEP_DAYS * 86_400_000),
          },
        }
      );
      finished = true;
      result = done.modifiedCount === 1 || after.status === "done" ? view : null;
    }

    return NextResponse.json({
      ok: true,
      correct,
      correctDisplay,
      explanation: q.explanation,
      answered: after ? after.items.filter((i) => i.answered).length : 0,
      finished,
      result,
    });
  } catch (err) {
    console.error("[quiz/answer]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
