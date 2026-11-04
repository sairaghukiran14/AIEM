import { NextResponse } from "next/server";

import { destroySession, getActiveSessionUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

/** Signs the account out on every device, this one included, by bumping the version stamped into its sessions. */
export async function POST() {
  const userId = await getActiveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  try {
    await connectDB();
    await User.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } });
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signout-all]", err);
    return NextResponse.json({ error: "Could not reach the database. Is MongoDB running?" }, { status: 500 });
  }
}
