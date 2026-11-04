import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Clock, FileText, Lock } from "lucide-react";

import { ChallengeRunner } from "@/components/challenges/ChallengeRunner";
import { TrackIcon } from "@/components/TrackIcon";
import { getTrack, toClientChallenge, tracks, trackXp } from "@/content";
import { getCurrentUser } from "@/lib/auth";
import { isGatePassed, isGateUnlocked, isTrackUnlocked, loadProgress } from "@/lib/progress";

import { TrackSkeleton } from "./TrackSkeleton";

type Props = { params: Promise<{ track: string }> };

export async function generateMetadata({ params }: Props) {
  const track = getTrack((await params).track);
  return { title: track?.title ?? "Track" };
}

export default async function TrackPage({ params }: Props) {
  const track = getTrack((await params).track);
  if (!track || !track.published) notFound();

  // The 404 check above runs before streaming starts, so unknown tracks keep their 404 status.
  return (
    <Suspense fallback={<TrackSkeleton />}>
      <TrackContent track={track} />
    </Suspense>
  );
}

async function TrackContent({ track }: { track: NonNullable<ReturnType<typeof getTrack>> }) {
  const user = await getCurrentUser();
  const progress = await loadProgress(user?.id);

  if (!isTrackUnlocked(track.slug, progress)) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <Lock className="mx-auto mb-3 size-8 text-text-dim" />
        <h1 className="text-xl font-semibold">This track is locked</h1>
        <p className="mt-2 text-sm text-text-muted">
          Pass the gate challenge of the previous track to unlock it.
        </p>
        <Link href="/tracks" className="btn btn-primary mt-5">
          Back to tracks
        </Link>
      </div>
    );
  }

  const gateUnlocked = isGateUnlocked(track.slug, progress);
  const gatePassed = isGatePassed(track.slug, progress);
  const doneLessons = track.lessons.filter((l) => progress.completedLessons.has(l.slug)).length;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-dim text-accent-soft">
          <TrackIcon name={track.icon} className="size-7" />
        </span>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs text-text-dim">Track {track.order}</span>
            <span className="chip">{track.level}</span>
            <span className="chip !border-amber/40 !text-amber">{trackXp(track)} XP</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
          <p className="mt-2 max-w-2xl text-text-muted">{track.description}</p>
          <p className="mt-3 text-sm text-text-dim">
            {doneLessons}/{track.lessons.length} lessons complete
          </p>
        </div>
        <Link href={`/cheatsheets/${track.slug}`} className="btn btn-ghost self-start">
          <FileText className="size-4" /> Cheatsheet
        </Link>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Lessons</h2>
        <ol className="space-y-2.5">
          {track.lessons.map((lesson) => {
            const done = progress.completedLessons.has(lesson.slug);
            return (
              <li key={lesson.slug}>
                <Link
                  href={`/learn/${track.slug}/${lesson.slug}`}
                  className="card flex items-center gap-4 p-4 transition-colors hover:border-accent/60 hover:bg-bg-hover"
                >
                  {done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-green" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-text-dim" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      <span className="mr-2 text-text-dim">{lesson.order}.</span>
                      {lesson.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-text-muted">{lesson.summary}</span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-xs text-text-dim sm:flex">
                    <Clock className="size-3.5" /> {lesson.minutes} min
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">What interviewers will ask</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {track.interviewTopics.map((topic) => (
            <li key={topic} className="rounded-lg border border-border-base bg-bg-card px-3 py-2 text-sm">
              {topic}
            </li>
          ))}
        </ul>
      </section>

      {track.gate && (
        <section id="gate" className="scroll-mt-24">
          <h2 className="mb-4 text-lg font-semibold">Track gate</h2>
          {gateUnlocked ? (
            <>
              <ChallengeRunner
                challenge={toClientChallenge(track.gate)}
                signedIn={Boolean(user)}
                passed={gatePassed}
              />
              {gatePassed && track.order === tracks.length && (
                <p className="mt-4 text-sm">
                  That was the last track.{" "}
                  <Link href="/capstone" className="font-semibold underline">
                    Take the capstone
                  </Link>{" "}
                  to earn the course certificate.
                </p>
              )}
            </>
          ) : (
            <div className="card flex items-center gap-4 p-5">
              <Lock className="size-6 shrink-0 text-text-dim" />
              <div>
                <p className="font-medium">{track.gate.title}</p>
                <p className="text-sm text-text-muted">
                  Complete all {track.lessons.length} lessons — every quiz, bug hunt and code
                  challenge — to unlock the gate.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
