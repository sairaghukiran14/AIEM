import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { keytermsFor } from "@/lib/live-interview";
import { limited, POLICIES } from "@/lib/rate-limit";
import { transcribe } from "@/lib/sarvam";
import { LiveInterview } from "@/models/LiveInterview";

/** A 28-second, 16 kHz WAV chunk is about 900 KB. */
const MAX_BYTES = 1_500_000;

/** Turns one chunk of an answer into text. The audio is passed through and never stored. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > MAX_BYTES) return NextResponse.json({ error: "That recording is too large" }, { status: 413 });

  try {
    const blocked = await limited(request, [{ policy: POLICIES.liveTranscribeUser, id: userId }]);
    if (blocked) return blocked;

    await connectDB();
    const interview = await LiveInterview.findOne({ _id: id, userId, status: "active" }).select("plan cursor codemix").lean();
    if (!interview) return NextResponse.json({ error: "This interview is not running" }, { status: 404 });

    const audio = await request.arrayBuffer();
    if (audio.byteLength === 0 || audio.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "That recording could not be used" }, { status: 400 });
    }
    const current = interview.cursor?.phase === "technical" ? (interview.plan[interview.cursor.index ?? 0] ?? null) : null;
    const text = await transcribe(new Blob([audio], { type: "audio/wav" }), {
      codemix: Boolean(interview.codemix),
      keyterms: keytermsFor(current as never),
    });
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[live-interview] transcribe", err);
    return NextResponse.json({ error: "We could not hear that. Please try again." }, { status: 502 });
  }
}
