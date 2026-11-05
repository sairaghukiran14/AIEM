import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { quizBank, quizCategories } from "@/content/quiz";
import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { attemptView } from "@/lib/quiz";
import { COUNTS, displayOrders, pickQuestionIds, POINTS } from "@/lib/quiz-core";
import { limited, POLICIES } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/read-json";
import { QuizAttempt } from "@/models/QuizAttempt";

const OPEN_DAYS = 3;

const Body = z.object({
  category: z.string().max(40),
  difficulty: z.enum(["mixed", "1", "2", "3"]),
  kind: z.enum(["all", "concept", "decision", "debug", "yesno"]),
  count: z.number().int().refine((n) => (COUNTS as readonly number[]).includes(n), "Choose 10, 20, 30 or 50 questions"),
});

export async function POST(request: Request) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to take the quiz" }, { status: 401 });

  const read = await readJsonBody(request, 2000);
  if (!read.ok) return read.response;
  const parsed = Body.safeParse(read.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid choices" }, { status: 400 });
  const f = parsed.data;
  if (f.category !== "all" && !quizCategories.some((c) => c.slug === f.category)) {
    return NextResponse.json({ error: "Unknown topic" }, { status: 400 });
  }

  try {
    const blocked = await limited(request, [{ policy: POLICIES.quizStartUser, id: userId }]);
    if (blocked) return blocked;
    await connectDB();

    // Prefer questions this learner has not met in their last few quizzes.
    const recent = await QuizAttempt.find({ userId, status: "done" }).sort({ createdAt: -1 }).limit(15).select("items.questionId").lean();
    const seen = new Set(recent.flatMap((a) => a.items.map((i) => i.questionId)));

    const ids = pickQuestionIds(quizBank, f, seen, Math.random);
    if (ids.length === 0) return NextResponse.json({ error: "No questions match those choices" }, { status: 400 });
    const questions = ids.map((id) => quizBank.find((q) => q.id === id)!);

    // A new quiz replaces any unfinished one.
    await QuizAttempt.deleteMany({ userId, status: "open" });
    const _id = new mongoose.Types.ObjectId();
    const orders = displayOrders(questions, _id.toString());
    const attempt = await QuizAttempt.create({
      _id,
      userId,
      category: f.category,
      difficulty: f.difficulty,
      kind: f.kind,
      count: questions.length,
      items: questions.map((q, i) => ({
        questionId: q.id,
        category: q.category,
        kind: q.kind,
        difficulty: q.difficulty,
        order: orders[i],
      })),
      maxScore: questions.reduce((n, q) => n + POINTS[q.difficulty], 0),
      expiresAt: new Date(Date.now() + OPEN_DAYS * 86_400_000),
    });
    return NextResponse.json({ ok: true, attempt: attemptView(attempt.toObject()) });
  } catch (err) {
    console.error("[quiz/start]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
