import { NextResponse } from "next/server";
import { z } from "zod";

import { getChallenge, quizOrders, reasonOrder } from "@/content";
import type { Challenge } from "@/content/types";
import { getSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { reconcileCertificates } from "@/lib/certificates";
import { awardXp, getUserProgress, grantBadge, isTrackUnlocked } from "@/lib/progress";
import { Progress } from "@/models/Progress";
import { Submission } from "@/models/Submission";
import { User } from "@/models/User";

const BodySchema = z.object({
  challengeId: z.string().min(1),
  answer: z.unknown(),
});

type Graded = {
  score: number;
  maxScore: number;
  passed: boolean;
  /** Safe-to-reveal feedback, only produced after the learner has submitted. */
  feedback: unknown;
};

function gradeQuiz(c: Extract<Challenge, { kind: "quiz" | "gate" }>, answer: unknown): Graded | null {
  const parsed = z.array(z.number().int().nullable()).length(c.questions.length).safeParse(answer);
  if (!parsed.success) return null;

  // The browser shows options in a shuffled display order and submits display
  // positions. Translate to the original index before comparing with the key, and
  // report the correct answer back as a display position too.
  const orders = quizOrders(c);

  const results = c.questions.map((q, i) => {
    const shown = parsed.data[i];
    const original = shown === null ? undefined : orders[i][shown];
    return {
      questionId: q.id,
      chosen: shown,
      correctIndex: orders[i].indexOf(q.correctIndex),
      correct: original === q.correctIndex,
      explanation: q.explanation,
    };
  });
  const score = results.filter((r) => r.correct).length;
  const maxScore = c.questions.length;

  return {
    score,
    maxScore,
    passed: (score / maxScore) * 100 >= c.passPercent,
    feedback: { results },
  };
}

function gradeBug(c: Extract<Challenge, { kind: "spot-the-bug" }>, answer: unknown): Graded | null {
  const parsed = z
    .object({ line: z.number().int().nullable(), reason: z.number().int().nullable() })
    .safeParse(answer);
  if (!parsed.success) return null;

  // Reasons are displayed shuffled; translate the submitted position back.
  const order = reasonOrder(c);
  const shown = parsed.data.reason;
  const originalReason = shown === null ? undefined : order[shown];

  const lineOk = parsed.data.line === c.buggyLine;
  const reasonOk = originalReason === c.correctReasonIndex;

  return {
    score: (lineOk ? 1 : 0) + (reasonOk ? 1 : 0),
    maxScore: 2,
    passed: lineOk && reasonOk,
    feedback: {
      lineOk,
      reasonOk,
      buggyLine: c.buggyLine,
      correctReasonIndex: order.indexOf(c.correctReasonIndex),
      explanation: c.explanation,
      fix: c.fix,
    },
  };
}

/**
 * Code challenges run in the learner's browser. The server cannot safely execute
 * arbitrary submitted code, so it records the client-reported result and checks
 * only that it is shaped sensibly. XP from these is therefore self-reported.
 */
function gradeCode(c: Extract<Challenge, { kind: "code" }>, answer: unknown): Graded | null {
  const parsed = z
    .object({ passedTests: z.number().int().min(0), totalTests: z.number().int() })
    .safeParse(answer);
  if (!parsed.success) return null;
  if (parsed.data.totalTests !== c.tests.length) return null;
  if (parsed.data.passedTests > parsed.data.totalTests) return null;

  return {
    score: parsed.data.passedTests,
    maxScore: parsed.data.totalTests,
    passed: parsed.data.passedTests === parsed.data.totalTests,
    feedback: null,
  };
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to submit" }, { status: 401 });

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const found = getChallenge(body.challengeId);
  if (!found) return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  const { challenge, track, lesson } = found;

  const graded =
    challenge.kind === "code"
      ? gradeCode(challenge, body.answer)
      : challenge.kind === "spot-the-bug"
        ? gradeBug(challenge, body.answer)
        : gradeQuiz(challenge, body.answer);

  if (!graded) return NextResponse.json({ error: "Malformed answer" }, { status: 400 });

  try {
    await connectDB();
    const before = await getUserProgress(userId);

    // Unlocking is enforced here, not only by hiding pages: a track is closed until
    // the previous track's gate has been passed.
    if (!isTrackUnlocked(track.slug, before)) {
      return NextResponse.json(
        { error: "This track is locked. Pass the previous track's gate first." },
        { status: 403 }
      );
    }

    // The gate can't be attempted until every lesson in the track is done.
    if (challenge.kind === "gate") {
      const ready = track.lessons.every((l) => before.completedLessons.has(l.slug));
      if (!ready) {
        return NextResponse.json(
          { error: "Complete every lesson in this track before the gate." },
          { status: 403 }
        );
      }
    }

    const alreadyPassed = before.passed.has(challenge.id);
    const xpAwarded = graded.passed && !alreadyPassed ? challenge.xp : 0;
    const attempt = (await Submission.countDocuments({ userId, challengeId: challenge.id })) + 1;

    await Submission.create({
      userId,
      challengeId: challenge.id,
      trackSlug: track.slug,
      lessonSlug: lesson?.slug ?? "",
      kind: challenge.kind,
      score: graded.score,
      maxScore: graded.maxScore,
      passed: graded.passed,
      attempt,
      xpAwarded,
      answer: body.answer ?? null,
    });

    if (xpAwarded > 0) await awardXp(userId, xpAwarded);

    // A lesson is complete once every one of its challenges has been passed.
    let lessonCompleted = false;
    if (graded.passed && lesson) {
      const passed = new Set(before.passed).add(challenge.id);
      if (lesson.challenges.every((c) => passed.has(c.id))) {
        lessonCompleted = true;
        await Progress.updateOne(
          { userId, lessonSlug: lesson.slug },
          {
            $set: { trackSlug: track.slug, status: "completed", completedAt: new Date() },
          },
          { upsert: true }
        );
      }
    }

    let trackCompleted = false;
    let certificates: { certId: string; kind: string; title: string }[] = [];
    if (graded.passed && challenge.kind === "gate") {
      trackCompleted = true;
      await grantBadge(userId, `track-${track.slug}`, `${track.title} complete`);

      // The pass is already saved. A certificate problem must not turn it into an
      // error: log it, and the certificates page will issue it on its next visit.
      try {
        const holder = await User.findById(userId).select("name").lean<{ name: string }>();
        const issued = await reconcileCertificates(userId, holder?.name ?? "Learner");
        certificates = issued
          .filter((c) => c.created)
          .map(({ certId, kind, title }) => ({ certId, kind, title }));
      } catch (err) {
        console.error("[certificates]", err);
      }
    }

    return NextResponse.json({
      ok: true,
      score: graded.score,
      maxScore: graded.maxScore,
      passed: graded.passed,
      xpAwarded,
      attempt,
      lessonCompleted,
      trackCompleted,
      certificates,
      feedback: graded.feedback,
    });
  } catch (err) {
    console.error("[submit]", err);
    return NextResponse.json({ error: "Could not save your result" }, { status: 500 });
  }
}
