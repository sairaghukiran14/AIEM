import { NextResponse } from "next/server";
import { z } from "zod";

import { getChallenge, quizOrders, reasonOrder, tracks } from "@/content";
import type { Challenge, Quiz } from "@/content/types";
import { getActiveSessionUserId } from "@/lib/auth";
import { gradeCodeInSandbox } from "@/lib/code-grader";
import { readJsonBody } from "@/lib/read-json";
import { limited, POLICIES } from "@/lib/rate-limit";
import { connectDB } from "@/lib/db";
import { EXAM_RETRY_SECONDS, hideAnswers, retryMessage, retryWaitSeconds } from "@/lib/exam-core";
import { reconcileIfAllowed } from "@/lib/email-verification";
import { awardXp, claimFirstPass, getUserProgress, grantBadge, isCapstoneUnlocked, isTrackUnlocked } from "@/lib/progress";
import { Progress } from "@/models/Progress";
import { SolutionView } from "@/models/SolutionView";
import { Submission } from "@/models/Submission";
import { User } from "@/models/User";

/** Every attempt is stored, so one learner cannot be allowed to fill the database. */
const MAX_ATTEMPTS_PER_CHALLENGE = 100;

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

function gradeQuiz(c: Quiz, answer: unknown): Graded | null {
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
 * Code challenges are graded here, by running the learner's code against the challenge's tests in a WebAssembly
 * sandbox (see lib/code-grader). The browser sends the code, not a result, so the pass count cannot be claimed.
 */
const MAX_CODE_CHARS = 20_000;

async function gradeCode(c: Extract<Challenge, { kind: "code" }>, answer: unknown): Promise<Graded | null> {
  const parsed = z.object({ code: z.string().min(1).max(MAX_CODE_CHARS) }).safeParse(answer);
  if (!parsed.success) return null;

  const result = await gradeCodeInSandbox(parsed.data.code, c.functionName, c.tests);
  return {
    score: result.passed,
    maxScore: result.total,
    passed: result.passed === result.total && !result.fatal,
    feedback: { fatal: result.fatal ?? null, outcomes: result.outcomes },
  };
}

export async function POST(request: Request) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to submit" }, { status: 401 });

  // Quiz and bug answers are tiny; code answers are source text. 80 KB is far above any real answer.
  const read = await readJsonBody(request, 80_000);
  if (!read.ok) return read.response;
  const parsedBody = BodySchema.safeParse(read.data);
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsedBody.data;

  try {
    const blocked = await limited(request, [{ policy: POLICIES.submitUser, id: userId }]);
    if (blocked) return blocked;
  } catch {
    return NextResponse.json({ error: "Could not save your result" }, { status: 500 });
  }

  const found = getChallenge(body.challengeId);
  if (!found) return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  const { challenge, track, lesson } = found;

  try {
    await connectDB();
    const before = await getUserProgress(userId);

    // Unlocking is enforced here, not only by hiding pages.
    if (track) {
      // A track is closed until the previous track's gate has been passed.
      if (!isTrackUnlocked(track.slug, before)) {
        return NextResponse.json(
          { error: "This track is locked. Pass the previous track's gate first." },
          { status: 403 }
        );
      }
    } else if (!isCapstoneUnlocked(before)) {
      // The capstone belongs to the course, not a track: it needs every gate.
      return NextResponse.json(
        { error: `Pass all ${tracks.length} track gates before the capstone.` },
        { status: 403 }
      );
    }

    // Gates and the capstone can be taken without the lessons, so retries are spaced out to stop trial and error.
    const isExam = challenge.kind === "gate" || challenge.kind === "capstone";
    const alreadyPassed = before.passed.has(challenge.id);
    if (isExam && !alreadyPassed) {
      const lastFail = await Submission.findOne({ userId, challengeId: challenge.id, passed: false })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean<{ createdAt: Date }>();
      const wait = retryWaitSeconds(lastFail?.createdAt, Date.now());
      if (wait > 0) {
        return NextResponse.json({ error: retryMessage(wait), retryAfterSeconds: wait }, { status: 429 });
      }
    }

    // Grade only now that the learner is allowed to attempt this challenge. Running code costs real CPU, so it also has
    // its own, tighter limit.
    if (challenge.kind === "code") {
      const blockedCode = await limited(request, [{ policy: POLICIES.codeUser, id: userId }]);
      if (blockedCode) return blockedCode;
    }
    const graded =
      challenge.kind === "code"
        ? await gradeCode(challenge, body.answer)
        : challenge.kind === "spot-the-bug"
          ? gradeBug(challenge, body.answer)
          : gradeQuiz(challenge, body.answer);
    if (!graded) return NextResponse.json({ error: "Malformed answer" }, { status: 400 });

    // Only one request can win the claim for a first pass, so a burst of identical passes awards XP once.
    const firstPass = graded.passed && !alreadyPassed && (await claimFirstPass(userId, challenge.id));
    const solutionViewed =
      firstPass && challenge.kind === "code" && Boolean(await SolutionView.exists({ userId, challengeId: challenge.id }));
    const xpAwarded = firstPass && !solutionViewed ? challenge.xp : 0;
    const attempt = (await Submission.countDocuments({ userId, challengeId: challenge.id })) + 1;
    if (attempt > MAX_ATTEMPTS_PER_CHALLENGE) {
      return NextResponse.json(
        { error: "You have used all the attempts allowed for this challenge. Contact support if you need more." },
        { status: 429 }
      );
    }

    await Submission.create({
      userId,
      challengeId: challenge.id,
      trackSlug: track?.slug ?? "capstone",
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
    if (graded.passed && lesson && track) {
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
    let capstoneCompleted = false;
    let certificates: { certId: string; kind: string; title: string }[] = [];
    let certificatesHeld = false;
    const earnsCertificate = graded.passed && (challenge.kind === "gate" || challenge.kind === "capstone");
    if (earnsCertificate) {
      if (challenge.kind === "capstone") {
        capstoneCompleted = true;
        await grantBadge(userId, "capstone", "Capstone complete");
      } else if (track) {
        trackCompleted = true;
        await grantBadge(userId, `track-${track.slug}`, `${track.title} complete`);
      }

      // The pass is already saved. A certificate problem must not turn it into an
      // error: log it, and the certificates page will issue it on its next visit.
      try {
        const holder = await User.findById(userId).select("name").lean<{ name: string }>();
        const result = await reconcileIfAllowed(userId, holder?.name ?? "Learner");
        certificatesHeld = result.held;
        certificates = result.issued
          .filter((c) => c.created)
          .map(({ certId, kind, title }) => ({ certId, kind, title }));
      } catch (err) {
        console.error("[certificates]", err);
      }
    }

    // A failed exam shows which questions were wrong, but never the key.
    const answersHidden = isExam && !graded.passed && !alreadyPassed;
    const feedback = answersHidden
      ? { results: hideAnswers((graded.feedback as { results: Parameters<typeof hideAnswers>[0] }).results) }
      : graded.feedback;

    return NextResponse.json({
      ok: true,
      score: graded.score,
      maxScore: graded.maxScore,
      passed: graded.passed,
      xpAwarded,
      attempt,
      lessonCompleted,
      trackCompleted,
      capstoneCompleted,
      certificates,
      certificatesHeld,
      solutionViewed,
      answersHidden,
      retryMessage: answersHidden ? retryMessage(EXAM_RETRY_SECONDS) : undefined,
      feedback,
    });
  } catch (err) {
    console.error("[submit]", err);
    return NextResponse.json({ error: "Could not save your result" }, { status: 500 });
  }
}
