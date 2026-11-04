import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";

import { TrackIcon } from "@/components/TrackIcon";
import { tracks } from "@/content";
import { getCurrentUser } from "@/lib/auth";
import { isGatePassed, isTrackUnlocked, loadProgress, trackCompletion } from "@/lib/progress";

export const metadata = { title: "Tracks" };

export default async function TracksPage() {
  const user = await getCurrentUser();
  const progress = await loadProgress(user?.id);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Tracks</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        {tracks.length} tracks from fundamentals to production. Pass a track&apos;s gate challenge to unlock
        the next one.
      </p>
      <p className="mt-3 text-sm text-text-muted">
        Not sure where to begin?{" "}
        <Link href="/assess" className="font-semibold text-text underline">
          Take the 10-minute placement check
        </Link>
        , or{" "}
        <Link href="/interview" className="font-semibold text-text underline">
          practise a mock interview
        </Link>
        .
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {tracks.map((track) => {
          const unlocked = isTrackUnlocked(track.slug, progress);
          const done = isGatePassed(track.slug, progress);
          const ids = [
            ...track.lessons.flatMap((l) => l.challenges.map((c) => c.id)),
            ...(track.gate ? [track.gate.id] : []),
          ];
          const pct = Math.round(trackCompletion(ids, progress) * 100);

          const body = (
            <>
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-accent-soft">
                  <TrackIcon name={track.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-text-dim">Track {track.order}</span>
                    <span className="chip">{track.level}</span>
                    {done && (
                      <span className="chip !border-green/50 !text-green">
                        <CheckCircle2 className="size-3" /> Complete
                      </span>
                    )}
                    {!track.published && <span className="chip !text-text-dim">Coming soon</span>}
                    {track.published && !unlocked && (
                      <span className="chip !text-text-dim">
                        <Lock className="size-3" /> Locked
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight">{track.title}</h2>
                  <p className="text-sm text-text-muted">{track.tagline}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-text-muted">{track.description}</p>

              <ul className="mt-4 flex flex-wrap gap-1.5">
                {track.interviewTopics.slice(0, 4).map((topic) => (
                  <li key={topic} className="rounded-md bg-bg px-2 py-1 text-xs text-text-dim">
                    {topic}
                  </li>
                ))}
              </ul>

              {track.published && (
                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs text-text-dim">
                    <span>{track.lessons.length} lessons</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </>
          );

          return track.published && unlocked ? (
            <Link
              key={track.slug}
              href={`/tracks/${track.slug}`}
              className="card block p-5 transition-colors hover:border-accent/60 hover:bg-bg-hover"
            >
              {body}
            </Link>
          ) : (
            <div key={track.slug} className="card p-5 opacity-60">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
