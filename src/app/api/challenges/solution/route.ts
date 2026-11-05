import { NextResponse } from "next/server";
import { z } from "zod";

import { getChallenge } from "@/content";
import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserProgress, isTrackUnlocked } from "@/lib/progress";
import { limited, POLICIES } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/read-json";
import { SolutionView } from "@/models/SolutionView";

const BodySchema = z.object({ challengeId: z.string().min(1).max(100) });

/** Gives a stuck learner the reference solution. Opening it before passing means that pass earns no XP. */
export async function POST(request: Request) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to see the solution" }, { status: 401 });

  const read = await readJsonBody(request, 2_000);
  if (!read.ok) return read.response;
  const body = BodySchema.safeParse(read.data);
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const found = getChallenge(body.data.challengeId);
  if (!found || found.challenge.kind !== "code" || !found.track) {
    return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  }

  try {
    const blocked = await limited(request, [{ policy: POLICIES.submitUser, id: userId }]);
    if (blocked) return blocked;

    await connectDB();
    const progress = await getUserProgress(userId);
    if (!isTrackUnlocked(found.track.slug, progress)) {
      return NextResponse.json({ error: "This track is locked." }, { status: 403 });
    }

    if (!progress.passed.has(found.challenge.id)) {
      await SolutionView.updateOne(
        { userId, challengeId: found.challenge.id },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }
    return NextResponse.json({ solution: found.challenge.solution });
  } catch (err) {
    console.error("[solution]", err);
    return NextResponse.json({ error: "Could not load the solution" }, { status: 500 });
  }
}
