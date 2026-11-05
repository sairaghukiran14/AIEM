import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LiveInterview } from "@/models/LiveInterview";

/** Deletes an interview's transcript and report. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await connectDB();
    const res = await LiveInterview.deleteOne({ _id: id, userId });
    if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[live-interview] delete", err);
    return NextResponse.json({ error: "Could not delete it" }, { status: 500 });
  }
}
