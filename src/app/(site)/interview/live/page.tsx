import { FastLink as Link } from "@/components/FastLink";
import { ArrowLeft } from "lucide-react";

import { LiveSetup } from "@/components/interview/LiveSetup";
import { publishedTracks } from "@/content";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { liveInterviewReady } from "@/lib/live-interview";
import { LiveInterview } from "@/models/LiveInterview";

export const metadata = { title: "Live voice interview" };

const when = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function loadPast(userId: string) {
  try {
    await connectDB();
    return await LiveInterview.find({ userId }).sort({ createdAt: -1 }).limit(10).select("status track level target createdAt report.overallScore").lean();
  } catch {
    return [];
  }
}

export default async function LiveInterviewPage() {
  const user = await requireUser("/interview/live");
  const ready = liveInterviewReady();
  const past = await loadPast(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/interview" className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft className="size-3.5" /> Mock interview
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Live voice interview</h1>
        <p className="mt-3 text-lg text-text-muted">
          Talk to an AI interviewer as you would in a real call. It asks questions out loud, listens to your answers and follows up on what you actually said. You get no feedback until the end, just like the real thing.
        </p>
      </header>

      {ready ? (
        <LiveSetup tracks={publishedTracks.map((t) => ({ slug: t.slug, order: t.order, title: t.title }))} />
      ) : (
        <p className="card p-5 text-sm" role="status">
          Voice interviews are not set up yet. Until they are, you can use the{" "}
          <Link href="/interview" className="font-medium underline">typed mock interview</Link>.
        </p>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Your interviews</h2>
          <ul className="space-y-2">
            {past.map((p) => {
              const score = (p.report as { overallScore?: number } | null)?.overallScore;
              return (
                <li key={String(p._id)}>
                  <Link href={`/interview/live/${p._id}`} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm transition-colors hover:bg-bg-hover">
                    <span>{when(p.createdAt)} · {p.target} questions · {p.level}</span>
                    <span className="font-medium">{p.status === "done" ? (score === undefined ? "No answers to mark" : `${score}/100`) : "Not finished"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
