import { FastLink as Link } from "@/components/FastLink";
import {
  ArrowRight,
  Award,
  Check,
  Flame,
  MessagesSquare,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";

import { TrackIcon } from "@/components/TrackIcon";
import { Tokenizer } from "@/components/visuals/Tokenizer";
import { courseTotals, tracks } from "@/content";

const LESSON_PARTS = [
  { title: "Concept", text: "The idea in plain language, with an interactive visual you can poke at." },
  { title: "Under the hood", text: "The mechanism interviewers actually probe: formulas, costs, trade-offs." },
  { title: "Code", text: "A runnable example that makes the mechanism concrete." },
  { title: "Interview corner", text: "Real questions, a strong answer, and what a weak one sounds like." },
  { title: "Challenges", text: "Quiz, spot-the-bug and real code, all scored. Pass to move on." },
];

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">{eyebrow}</p>
      <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-text-muted">{children}</p>}
    </div>
  );
}

export default function HomePage() {
  const sample = tracks[0].lessons[0].interview[0];
  const live = tracks.filter((t) => t.published).length;

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* ------------------------------------------------------------ hero */}
      <section className="bg-grid relative overflow-hidden rounded-3xl border border-border-base bg-bg-card">
        <div className="grid items-center gap-12 px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div className="animate-fade-up">
            <span className="chip bg-bg-card !text-text-muted">Interview-ready AI engineering</span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              Learn AI engineering.
              <br />
              Prove it.
              <br />
              <span className="text-text-dim">Get hired.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-text-muted">
              A structured course from &ldquo;what&apos;s a token?&rdquo; to production agents. Learn
              from interactive visuals, prove it with scored challenges, and walk into interviews
              knowing the answers.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary !px-6 !py-3 !text-base">
                Start learning free <ArrowRight className="size-4" />
              </Link>
              <Link href="/tracks" className="btn btn-ghost !px-6 !py-3 !text-base">
                Browse the tracks
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
              {[
                "Free to start",
                "No credit card",
                `${courseTotals.lessons} lessons live now`,
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-4 text-text" /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Real, interactive lesson visual */}
          <div className="card overflow-hidden shadow-[0_12px_40px_rgb(0_0_0/0.08)]">
            <div className="flex items-center gap-3 border-b border-border-base bg-bg-raised px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden>
                <i className="size-2.5 rounded-full bg-border-strong" />
                <i className="size-2.5 rounded-full bg-border-strong" />
                <i className="size-2.5 rounded-full bg-border-strong" />
              </span>
              <span className="text-xs text-text-dim">Lesson 2 · Tokens &amp; Tokenization — try it</span>
            </div>
            <div className="p-4 sm:p-5">
              <Tokenizer />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- stats */}
      <section>
        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border-base bg-bg-card lg:grid-cols-4">
          {[
            [courseTotals.tracks, "tracks, beginner to advanced"],
            [courseTotals.lessons, "lessons live today"],
            [courseTotals.challenges, "scored challenges live"],
            [courseTotals.xp.toLocaleString(), "XP to earn so far"],
          ].map(([value, label], i) => (
            <div
              key={label}
              className={`p-6 sm:p-8 ${i % 2 === 1 ? "border-l border-border-base" : ""} ${
                i >= 2 ? "border-t border-border-base lg:border-t-0" : ""
              } ${i === 2 ? "lg:border-l lg:border-border-base" : ""}`}
            >
              <dt className="text-4xl font-semibold tracking-tight sm:text-5xl">{value}</dt>
              <dd className="mt-2 text-sm text-text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ----------------------------------------------------- how it works */}
      <section>
        <SectionHeading eyebrow="How a lesson works" title="Five parts, the same every time.">
          No hunting for the point. Every lesson follows one shape, built to take you from
          understanding it to explaining it under pressure.
        </SectionHeading>

        <ol className="grid gap-px overflow-hidden rounded-2xl border border-border-base bg-border-base sm:grid-cols-2 lg:grid-cols-5">
          {LESSON_PARTS.map((part, i) => (
            <li key={part.title} className="bg-bg-card p-6">
              <span className="flex size-8 items-center justify-center rounded-full border border-border-strong text-sm font-semibold">
                {i + 1}
              </span>
              <h3 className="mt-5 font-semibold">{part.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{part.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------- bento */}
      <section>
        <SectionHeading eyebrow="What you get" title="Built to make you interview-ready.">
          Not slides to skim. Things to use, break, and get scored on.
        </SectionHeading>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Interview corner: real content */}
          <article className="card p-6 sm:p-8 lg:col-span-2">
            <div className="mb-5 flex items-center gap-2 text-sm font-medium text-text-muted">
              <MessagesSquare className="size-4" /> Interview corner · real question from Lesson 1
            </div>
            <h3 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              &ldquo;{sample.question}&rdquo;
            </h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-text p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <ThumbsUp className="size-3.5" /> Strong answer
                </p>
                <p className="text-sm leading-relaxed text-text-muted">{sample.answer}</p>
              </div>
              <div className="rounded-xl border border-dashed border-border-strong p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-dim">
                  <ThumbsDown className="size-3.5" /> Weak answer
                </p>
                <p className="text-sm leading-relaxed text-text-dim">
                  {sample.weakAnswer?.split(" — ")[0]}
                </p>
              </div>
            </div>
          </article>

          {/* Scored challenges */}
          <article className="card p-6 sm:p-8">
            <p className="mb-4 text-sm font-medium text-text-muted">Scored challenges</p>
            <p className="text-sm font-medium leading-snug">
              Which workload has the highest time-to-first-token?
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "50-token prompt, 2,000 tokens out",
                "20,000-token prompt, 50 tokens out",
                "50-token prompt, 50 tokens out",
              ].map((opt, i) => (
                <li
                  key={opt}
                  className={`rounded-lg border px-3 py-2 ${
                    i === 1 ? "border-2 border-text bg-bg-raised font-medium" : "border-border-base text-text-muted"
                  }`}
                >
                  {opt}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-text-dim">
              <Check className="size-3.5" /> Graded on the server. Retry as often as you like.
            </p>
          </article>

          {/* Spot the bug */}
          <article className="card p-6 sm:p-8">
            <p className="mb-4 text-sm font-medium text-text-muted">Spot the bug</p>
            <div className="overflow-x-auto rounded-xl border border-border-base bg-bg font-mono text-[12px] leading-6">
              {[
                "def top_p(probs, p):",
                "    total, kept = 0, []",
                "    for i, x in enumerate(sorted(probs)):",
                "        total += x",
                "        kept.append(i)",
                "        if total >= p: break",
              ].map((line, i) => (
                <div
                  key={i}
                  className={`flex gap-3 px-3 ${i === 2 ? "border-l-2 border-text bg-bg-hover font-semibold" : ""}`}
                >
                  <span className="w-3 text-right text-text-dim">{i + 1}</span>
                  <span className="whitespace-pre">{line}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-text-dim">
              Click the broken line, then say why. Both are scored.
            </p>
          </article>

          {/* Progress */}
          <article className="card p-6 sm:p-8">
            <p className="mb-4 text-sm font-medium text-text-muted">Progress that sticks</p>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-2xl font-semibold">
                <Zap className="size-5" /> 640
              </span>
              <span className="flex items-center gap-1.5 text-2xl font-semibold text-text-muted">
                <Flame className="size-5" /> 7
              </span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-bg-hover">
              <div className="h-full w-3/4 rounded-full bg-text" />
            </div>
            <p className="mt-3 text-xs text-text-dim">
              Example dashboard. XP, day streaks and badges are saved to your account.
            </p>
          </article>

          {/* Certificate */}
          <article className="card p-6 sm:p-8">
            <p className="mb-4 text-sm font-medium text-text-muted">Certificates</p>
            <div className="rounded-xl border-2 border-text p-5 text-center">
              <Award className="mx-auto size-8" />
              <p className="mt-3 font-semibold">Certificate of completion</p>
              <p className="mt-1 text-xs leading-relaxed text-text-dim">
                One per track gate you pass, and a course certificate after all {tracks.length} and the
                capstone. Each has a public verification link and a PDF.
              </p>
              <Link href="/verify" className="mt-3 inline-block text-xs font-medium underline">
                Verify a certificate
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* -------------------------------------------------------- roadmap */}
      <section>
        <SectionHeading eyebrow="The roadmap" title="Eight tracks. One path.">
          Each track unlocks when you pass the gate challenge of the one before it.{" "}
          {live} {live === 1 ? "track is" : "tracks are"} live; the rest are on the way.
        </SectionHeading>

        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tracks.map((t) => {
            const body = (
              <>
                <span className="w-8 shrink-0 text-2xl font-semibold tabular-nums text-text-dim">
                  {String(t.order).padStart(2, "0")}
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-dim">
                  <TrackIcon name={t.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">{t.title}</span>
                  <span className="block text-sm text-text-muted">{t.tagline}</span>
                </span>
                <span className="chip">{t.level}</span>
                {t.published ? (
                  <span className="chip !border-text !bg-text !text-white">Live</span>
                ) : (
                  <span className="chip !text-text-dim">Soon</span>
                )}
              </>
            );
            return (
              <li key={t.slug}>
                {t.published ? (
                  <Link
                    href={`/tracks/${t.slug}`}
                    className="card flex items-center gap-4 p-4 transition-colors hover:border-text"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="card flex items-center gap-4 p-4 opacity-60">{body}</div>
                )}
              </li>
            );
          })}
        </ol>

        <Link
          href="/capstone"
          className="card mt-3 flex items-center gap-4 border-2 !border-text p-4 transition-colors hover:bg-bg-hover"
        >
          <span className="w-8 shrink-0 text-2xl font-semibold tabular-nums text-text-dim">★</span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-dim">
            <Award className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug">Capstone: ship a support copilot</span>
            <span className="block text-sm text-text-muted">
              Thirty-six decisions across every track, plus portfolio projects. Earns the course certificate.
            </span>
          </span>
          <span className="chip">Final</span>
        </Link>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="rounded-3xl bg-text px-6 py-14 text-center text-white sm:px-12 sm:py-20">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Start with Track 1 today.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
          {tracks[0].lessons.length} lessons, {tracks[0].lessons.length * 3} challenges and a gate.
          Free to start, and your progress is saved the moment you sign up.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn !bg-white !px-6 !py-3 !text-base !text-black hover:!bg-bg-hover">
            Create free account <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/tracks/llm-foundations"
            className="btn !border !border-white/30 !px-6 !py-3 !text-base !text-white hover:!bg-white/10"
          >
            Preview Track 1
          </Link>
        </div>
      </section>
    </div>
  );
}
