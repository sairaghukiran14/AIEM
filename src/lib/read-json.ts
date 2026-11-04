import "server-only";

import { NextResponse } from "next/server";

type Read = { ok: true; data: unknown } | { ok: false; response: NextResponse };

const tooLarge = () => NextResponse.json({ error: "That request is too large" }, { status: 413 });
const invalid = () => NextResponse.json({ error: "Invalid request body" }, { status: 400 });

/**
 * Reads a JSON body without ever holding more than `maxBytes` of it. The declared length is checked first,
 * and the stream is cut off as soon as it passes the limit, so an oversized body cannot use up memory or
 * be stored. Routes pick a limit that fits what they accept.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<Read> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, response: tooLarge() };

  if (!request.body) return { ok: false, response: invalid() };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, response: tooLarge() };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, response: invalid() };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, response: invalid() };
  }
}
