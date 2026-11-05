import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { writeReport } from "@/lib/interview-scorecard";
import { limited, POLICIES } from "@/lib/rate-limit";
import { LiveInterview } from "@/models/LiveInterview";

export const maxDuration = 180;

/** A scoring attempt older than this is taken to have crashed and can be started again. */
const STALE_MS = 5 * 60_000;

/** Ends the interview and writes the scorecard. Safe to call again: only one request can score, and a failure can be retried. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const blocked = await limited(request, [{ policy: POLICIES.liveFinishUser, id: userId }]);
    if (blocked) return blocked;

    await connectDB();
    const stale = new Date(Date.now() - STALE_MS);
    const claimed = await LiveInterview.findOneAndUpdate(
      {
        _id: id,
        userId,
        $or: [{ status: { $in: ["active", "ended"] } }, { status: "scoring", scoringStartedAt: { $lt: stale } }],
      },
      { $set: { status: "scoring", scoringStartedAt: new Date() } },
      { returnDocument: "after" }
    ).lean();

    if (!claimed) {
      const existing = await LiveInterview.findOne({ _id: id, userId }).select("status").lean();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ status: existing.status });
    }

    // Nothing to mark, so nothing is spent.
    const answered = claimed.turns.some((t) => t.role === "candidate" && t.questionIndex >= 0);
    if (!answered) {
      await LiveInterview.updateOne({ _id: id }, { $set: { status: "done", report: null, endedAt: claimed.endedAt ?? new Date() } });
      return NextResponse.json({ status: "done" });
    }

    try {
      const report = await writeReport({ level: claimed.level, plan: claimed.plan as never, turns: claimed.turns as never });
      await LiveInterview.updateOne({ _id: id }, { $set: { status: "done", report, endedAt: claimed.endedAt ?? new Date() } });
      return NextResponse.json({ status: "done" });
    } catch (err) {
      console.error("[live-interview] scorecard", err);
      await LiveInterview.updateOne({ _id: id }, { $set: { status: "ended", endedAt: claimed.endedAt ?? new Date() } });
      return NextResponse.json({ error: "Your scorecard could not be written. Your answers are saved, so you can try again." }, { status: 502 });
    }
  } catch (err) {
    console.error("[live-interview] finish", err);
    return NextResponse.json({ error: "Could not finish the interview" }, { status: 500 });
  }
}
