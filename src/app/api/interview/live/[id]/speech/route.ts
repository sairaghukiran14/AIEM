import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { limited, POLICIES } from "@/lib/rate-limit";
import { speakStream, TTS_MODEL, type VoiceId } from "@/lib/sarvam";
import { LiveInterview } from "@/models/LiveInterview";
import { SpeechCache } from "@/models/SpeechCache";

const CACHE_DAYS = 90;
const MAX_CACHED_BYTES = 2_000_000;

const audioResponse = (body: BodyInit, cached: boolean) =>
  new Response(body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", "X-Speech-Cache": cached ? "hit" : "miss" } });

/**
 * Plays one of the interviewer's saved lines. It takes a turn number rather than text, so this route cannot be used as
 * a free text-to-speech service on our API key. Fixed lines are stored after their first use and replayed from then on.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  const turn = Number(new URL(request.url).searchParams.get("turn"));
  if (!isValidObjectId(id) || !Number.isInteger(turn) || turn < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const blocked = await limited(request, [{ policy: POLICIES.liveSpeechUser, id: userId }]);
    if (blocked) return blocked;

    await connectDB();
    const interview = await LiveInterview.findOne({ _id: id, userId }).select("voice turns").lean();
    const line = interview?.turns[turn];
    if (!interview || line?.role !== "interviewer") return NextResponse.json({ error: "Not found" }, { status: 404 });
    const voice = interview.voice as VoiceId;

    const key = line.cacheable ? createHash("sha256").update(`${TTS_MODEL}|${voice}|${line.text}`).digest("hex") : null;
    if (key) {
      const hit = await SpeechCache.findOne({ key }).select("audio").lean();
      if (hit) {
        // A lean query returns the stored bytes as a BSON Binary, not a Buffer.
        const raw = hit.audio as unknown as Buffer | { buffer: Uint8Array };
        return audioResponse(new Uint8Array(Buffer.isBuffer(raw) ? raw : raw.buffer), true);
      }
    }

    const audio = await speakStream(line.text, voice);
    if (!audio.ok || !audio.body) {
      console.error("[live-interview] speech", audio.status);
      return NextResponse.json({ error: "Could not play that" }, { status: 502 });
    }
    if (!key) return audioResponse(audio.body, false);

    // Stream to the listener now, and keep a copy to store once the whole line has arrived.
    const [forListener, forCache] = audio.body.tee();
    after(async () => {
      try {
        const bytes = Buffer.from(await new Response(forCache).arrayBuffer());
        if (bytes.length === 0 || bytes.length > MAX_CACHED_BYTES) return;
        await SpeechCache.updateOne(
          { key },
          { $setOnInsert: { audio: bytes, expiresAt: new Date(Date.now() + CACHE_DAYS * 86_400_000) } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[live-interview] speech cache", err);
      }
    });
    return audioResponse(forListener, false);
  } catch (err) {
    console.error("[live-interview] speech", err);
    return NextResponse.json({ error: "Could not play that" }, { status: 502 });
  }
}
