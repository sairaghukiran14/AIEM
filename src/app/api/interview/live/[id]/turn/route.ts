import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { advance, type Level, type PlanItem } from "@/lib/live-interview";
import { MAX_ANSWER_CHARS, maxTurns, roundOf, roundsFor, startCursor, type Cursor, type Difficulty } from "@/lib/live-interview-core";
import { limited, POLICIES } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/read-json";
import type { VoiceId } from "@/lib/sarvam";
import { LiveInterview } from "@/models/LiveInterview";

const BodySchema = z.object({
  answer: z.string().trim().min(1).max(MAX_ANSWER_CHARS),
  /** How many turns the browser has seen, so a double submit cannot record an answer twice. */
  turnCount: z.number().int().min(1),
  seconds: z.number().min(0).max(600).nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const read = await readJsonBody(request, MAX_ANSWER_CHARS * 2);
  if (!read.ok) return read.response;
  const body = BodySchema.safeParse(read.data);
  if (!body.success) return NextResponse.json({ error: "Invalid answer" }, { status: 400 });

  try {
    const blocked = await limited(request, [{ policy: POLICIES.liveTurnUser, id: userId }]);
    if (blocked) return blocked;

    await connectDB();
    const interview = await LiveInterview.findOne({ _id: id, userId, status: "active" }).lean();
    if (!interview) return NextResponse.json({ error: "This interview is not running" }, { status: 404 });
    if (interview.turns.length !== body.data.turnCount) {
      return NextResponse.json({ error: "This answer was already received" }, { status: 409 });
    }

    const cursor = (interview.cursor ?? startCursor()) as Cursor;
    const overLimit = interview.turns.length >= maxTurns(interview.target);
    const next = await advance({
      cursor: overLimit ? { ...cursor, phase: "closing" } : cursor,
      plan: interview.plan as PlanItem[],
      target: interview.target,
      track: interview.track,
      difficulty: interview.difficulty as Difficulty,
      qualities: interview.qualities as { index: number; value: number }[],
      turns: interview.turns,
      answer: body.data.answer,
      voice: interview.voice as VoiceId,
      level: interview.level as Level,
    });
    const ended = next.cursor.phase === "ended";
    const questionIndex = cursor.phase === "technical" ? (cursor.index ?? 0) : -1;

    const push: Record<string, unknown> = {
      turns: {
        $each: [
          { role: "candidate", text: body.data.answer, questionIndex, seconds: body.data.seconds },
          {
            role: "interviewer",
            text: next.line,
            questionIndex: next.cursor.phase === "technical" ? (next.cursor.index ?? 0) : -1,
            cacheable: next.cacheable,
            roundBreak: next.roundBreak,
          },
        ],
      },
    };
    if (next.added) push.plan = next.added;
    if (next.quality) push.qualities = next.quality;

    // Conditional on the turn count: of two identical requests, only one is recorded.
    const saved = await LiveInterview.updateOne(
      { _id: id, userId, status: "active", turns: { $size: body.data.turnCount } },
      {
        $push: push,
        $set: { cursor: next.cursor, difficulty: next.difficulty, ...(ended ? { status: "ended", endedAt: new Date() } : {}) },
      }
    );
    if (saved.modifiedCount === 0) return NextResponse.json({ error: "This answer was already received" }, { status: 409 });

    const target = interview.target;
    return NextResponse.json({
      line: next.line,
      turnCount: body.data.turnCount + 2,
      ended,
      roundBreak: next.roundBreak,
      progress: {
        phase: next.cursor.phase,
        index: next.cursor.index,
        total: target,
        round: roundOf(next.cursor.index ?? 0, target),
        rounds: roundsFor(target),
      },
    });
  } catch (err) {
    console.error("[live-interview] turn", err);
    return NextResponse.json({ error: "The interviewer could not respond. Please try again." }, { status: 502 });
  }
}
