import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock, MessagesSquare } from "lucide-react";

import { BlockRenderer, CodeBlock } from "@/components/BlockRenderer";
import { ChallengeRunner } from "@/components/challenges/ChallengeRunner";
import { RichText } from "@/components/RichText";
import { getLesson, getLessonNeighbours, toClientChallenge } from "@/content";
import { getCurrentUser } from "@/lib/auth";
import { isTrackUnlocked, loadProgress } from "@/lib/progress";

type Props = { params: Promise<{ track: string; lesson: string }> };

export async function generateMetadata({ params }: Props) {
  const { track, lesson } = await params;
  return { title: getLesson(track, lesson)?.lesson.title ?? "Lesson" };
}

const SECTIONS = [
  { id: "concept", label: "Concept" },
  { id: "under-the-hood", label: "Under the hood" },
  { id: "code", label: "Code" },
  { id: "interview", label: "Interview corner" },
  { id: "challenges", label: "Challenges" },
];

function SectionHeading({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-5 flex scroll-mt-24 items-center gap-3 text-2xl font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-accent-dim text-sm text-accent-soft">
        {n}
      </span>
      {children}
    </h2>
  );
}

export default async function LessonPage({ params }: Props) {
  const { track: trackSlug, lesson: lessonSlug } = await params;
  const found = getLesson(trackSlug, lessonSlug);
  if (!found) notFound();
  const { track, lesson } = found;

  const user = await getCurrentUser();
  const progress = await loadProgress(user?.id);

  if (!isTrackUnlocked(track.slug, progress)) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <Lock className="mx-auto mb-3 size-8 text-text-dim" />
        <h1 className="text-xl font-semibold">This track is locked</h1>
        <p className="mt-2 text-sm text-text-muted">
          Pass the previous track&apos;s gate challenge to unlock it.
        </p>
        <Link href="/tracks" className="btn btn-primary mt-5">
          Back to tracks
        </Link>
      </div>
    );
  }

  const { prev, next } = getLessonNeighbours(track, lesson);
  const completed = progress.completedLessons.has(lesson.slug);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_14rem]">
      <article className="min-w-0 space-y-14">
        <header>
          <Link
            href={`/tracks/${track.slug}`}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeft className="size-3.5" /> {track.title}
          </Link>
          <div className="mb-2 flex items-center gap-3 text-xs text-text-dim">
            <span>Lesson {lesson.order}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {lesson.minutes} min
            </span>
            {completed && (
              <span className="flex items-center gap-1 text-green">
                <CheckCircle2 className="size-3.5" /> Complete
              </span>
            )}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">{lesson.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-text-muted">{lesson.summary}</p>
        </header>

        <section>
          <SectionHeading n={1} id="concept">Concept</SectionHeading>
          <BlockRenderer blocks={lesson.concept} />
        </section>

        <section>
          <SectionHeading n={2} id="under-the-hood">Under the hood</SectionHeading>
          <BlockRenderer blocks={lesson.underTheHood} />
        </section>

        <section>
          <SectionHeading n={3} id="code">Code example</SectionHeading>
          <CodeBlock
            code={lesson.codeExample.code}
            language={lesson.codeExample.language}
            caption={lesson.codeExample.caption}
          />
        </section>

        <section>
          <SectionHeading n={4} id="interview">Interview corner</SectionHeading>
          <p className="mb-5 text-sm text-text-muted">
            Try answering out loud before opening each one. The weak answer is the one most
            candidates give.
          </p>
          <div className="space-y-3">
            {lesson.interview.map((qa, i) => (
              <details key={i} className="card group p-4 open:border-accent/50">
                <summary className="flex cursor-pointer list-none items-start gap-3 font-medium">
                  <MessagesSquare className="mt-0.5 size-4 shrink-0 text-green" />
                  <span>{qa.question}</span>
                </summary>
                <div className="mt-4 space-y-3 border-t border-border-base pt-4 text-sm leading-relaxed">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green">
                      Strong answer
                    </p>
                    <p className="text-text-muted">
                      <RichText text={qa.answer} />
                    </p>
                  </div>
                  {qa.weakAnswer && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red">
                        Weak answer
                      </p>
                      <p className="text-text-muted">
                        <RichText text={qa.weakAnswer} />
                      </p>
                    </div>
                  )}
                  {qa.followUp && (
                    <p className="text-text-dim">
                      <span className="font-medium text-text-muted">Likely follow-up: </span>
                      {qa.followUp}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading n={5} id="challenges">Challenges</SectionHeading>
          <p className="mb-5 text-sm text-text-muted">
            Pass all {lesson.challenges.length} to complete this lesson. You can retry as often as
            you like; XP is awarded the first time you pass each one.
          </p>
          {!user && (
            <p className="mb-5 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-sm text-text-muted">
              <Link href="/signup" className="font-medium text-amber hover:underline">
                Create a free account
              </Link>{" "}
              to submit answers, earn XP and track your progress.
            </p>
          )}
          <div className="space-y-6">
            {lesson.challenges.map((challenge) => (
              <ChallengeRunner
                key={challenge.id}
                challenge={toClientChallenge(challenge)}
                signedIn={Boolean(user)}
                passed={progress.passed.has(challenge.id)}
              />
            ))}
          </div>
        </section>

        <nav className="flex flex-col gap-3 border-t border-border-base pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {prev ? (
            <Link
              href={`/learn/${track.slug}/${prev.slug}`}
              className="btn btn-ghost !justify-start !whitespace-normal text-left"
            >
              <ArrowLeft className="size-4 shrink-0" /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/learn/${track.slug}/${next.slug}`}
              className="btn btn-primary !justify-end !whitespace-normal text-right"
            >
              {next.title} <ArrowRight className="size-4 shrink-0" />
            </Link>
          ) : (
            <Link href={`/tracks/${track.slug}#gate`} className="btn btn-primary">
              Go to the track gate <ArrowRight className="size-4" />
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden lg:block">
        <nav className="sticky top-20 space-y-1 text-sm" aria-label="On this page">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">
            On this page
          </p>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block rounded-md px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  );
}
