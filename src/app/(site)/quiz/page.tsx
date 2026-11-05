import { QuizApp, type QuizStats } from "@/components/quiz/QuizApp";
import { quizBank, quizCategories } from "@/content/quiz";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { attemptView, bankSize } from "@/lib/quiz";
import { rating } from "@/lib/quiz-core";
import { QuizAttempt } from "@/models/QuizAttempt";

export const metadata = { title: "Quiz" };

const when = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function load(userId: string): Promise<{ stats: QuizStats; resume: ReturnType<typeof attemptView> | null }> {
  await connectDB();
  const done = await QuizAttempt.find({ userId, status: "done" }).sort({ createdAt: -1 }).limit(100).lean();
  const open = await QuizAttempt.findOne({ userId, status: "open" }).sort({ createdAt: -1 }).lean();

  const real = done.filter((a) => a.count >= 10);
  const mastered = new Set<string>();
  for (const a of done) for (const i of a.items) if (i.correct) mastered.add(i.questionId);

  return {
    stats: {
      attempts: done.length,
      best: real.length ? Math.max(...real.map((a) => a.percent)) : null,
      average: real.length ? Math.round(real.reduce((n, a) => n + a.percent, 0) / real.length) : null,
      mastered: mastered.size,
      bank: bankSize,
      recent: done.slice(0, 8).map((a) => ({
        id: a._id.toString(),
        percent: a.percent,
        score: a.score,
        maxScore: a.maxScore,
        total: a.count,
        when: when(a.finishedAt ?? a.createdAt),
        label: rating(a.percent).label,
      })),
    },
    resume: open ? attemptView(open) : null,
  };
}

export default async function QuizPage() {
  const user = await getCurrentUser();
  const data = user ? await load(user.id) : null;
  const categories = quizCategories.map((c) => ({ slug: c.slug, title: c.title, blurb: c.blurb, count: quizBank.filter((q) => q.category === c.slug).length }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Practice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quiz</h1>
        <p className="mt-3 text-lg text-text-muted">
          {bankSize.toLocaleString("en-GB")} questions from fundamentals to production and scaling: concepts, decisions,
          debugging and yes-or-no calls, easy to hard. The wrong options are meant to be tempting.
        </p>
        <p className="mt-3 text-sm text-text-dim">
          You see the answer and the reasoning after each question. Easy questions score 1 point, medium 2, hard 3.
          Quizzes are practice: they are saved to your account but do not unlock tracks or certificates.
        </p>
      </header>
      <QuizApp signedIn={Boolean(user)} categories={categories} stats={data?.stats ?? null} resume={data?.resume ?? null} />
    </div>
  );
}
