import { NextResponse } from "next/server";
import { z } from "zod";

import { tracks } from "@/content";
import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { liveInterviewReady, openingLine } from "@/lib/live-interview";
import { LENGTHS, startCursor, startDifficulty } from "@/lib/live-interview-core";
import { limited, POLICIES } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/read-json";
import { LiveInterview } from "@/models/LiveInterview";

const KEEP_DAYS = 180;

const BodySchema = z.object({
  track: z.string().refine((t) => t === "mixed" || tracks.some((x) => x.slug === t && x.published)),
  questions: z.number().int().refine((n) => (LENGTHS as readonly number[]).includes(n)),
  level: z.enum(["junior", "mid", "senior"]),
  voice: z.enum(["simran", "dev"]),
  codemix: z.boolean(),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to start an interview" }, { status: 401 });
  if (!liveInterviewReady()) return NextResponse.json({ error: "Voice interviews are not set up yet." }, { status: 503 });

  const read = await readJsonBody(request, 2_000);
  if (!read.ok) return read.response;
  const body = BodySchema.safeParse(read.data);
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    // Long interviews cost several times more, so they have their own, lower daily limit.
    const policy = body.data.questions >= 10 ? POLICIES.liveLongStartUser : POLICIES.liveStartUser;
    const blocked = await limited(request, [{ policy, id: userId }]);
    if (blocked) return blocked;

    await connectDB();
    const interview = await LiveInterview.create({
      userId,
      track: body.data.track,
      level: body.data.level,
      voice: body.data.voice,
      codemix: body.data.codemix,
      plan: [],
      target: body.data.questions,
      difficulty: startDifficulty(body.data.level),
      cursor: startCursor(),
      turns: [{ role: "interviewer", text: openingLine(body.data.voice, body.data.questions), questionIndex: -1, cacheable: true }],
      expiresAt: new Date(Date.now() + KEEP_DAYS * 86_400_000),
    });
    return NextResponse.json({ id: String(interview._id) });
  } catch (err) {
    console.error("[live-interview] start", err);
    return NextResponse.json({ error: "Could not start the interview" }, { status: 500 });
  }
}
