import Link from "next/link";
import { Award, CheckCircle2, Circle, Lock } from "lucide-react";

import { ChallengeRunner } from "@/components/challenges/ChallengeRunner";
import { ProjectChecklist } from "@/components/ProjectChecklist";
import { capstone, getTrack, toClientChallenge, tracks } from "@/content";
import { projects } from "@/content/projects";
import { getCurrentUser } from "@/lib/auth";
import { isCapstoneUnlocked, loadProgress } from "@/lib/progress";

export const metadata = { title: "Capstone" };

const SECTIONS = [
  "The prompt and the model interface",
  "Grounding answers in documents and data",
  "Letting the copilot take actions",
  "Proving it works, and keeping it that way",
  "Adapting the model only where it pays",
  "Running it in production",
];

export default async function CapstonePage() {
  const user = await getCurrentUser();
  const progress = await loadProgress(user?.id);

  const unlocked = isCapstoneUnlocked(progress);
  const passed = progress.passed.has(capstone.id);
  const gatesPassed = tracks.filter((t) => t.gate && progress.passed.has(t.gate.id)).length;

  return (
    <div className="space-y-12">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Final assessment</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{capstone.title}</h1>
        <p className="mt-3 text-lg text-text-muted">
          One case study and thirty decisions that cut across every track. It is how the course checks that you
          can combine what you learned, not just recall it.
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-text-dim">Questions</dt>
            <dd className="font-semibold">{capstone.questions.length}</dd>
          </div>
          <div>
            <dt className="text-text-dim">To pass</dt>
            <dd className="font-semibold">{capstone.passPercent}%</dd>
          </div>
          <div>
            <dt className="text-text-dim">XP</dt>
            <dd className="font-semibold">{capstone.xp}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Reward</dt>
            <dd className="font-semibold">Course certificate</dd>
          </div>
        </dl>
      </header>

      <section className="max-w-3xl">
        <h2 className="mb-3 text-lg font-semibold">What it covers</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s} className="rounded-lg border border-border-base bg-bg-card px-3 py-2 text-sm">
              <span className="mr-2 text-text-dim">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-text-muted">
          Graded on the server, like the track gates. You can retry as often as you like. The course certificate
          needs <strong className="text-text">all {tracks.length} track gates and this capstone</strong>.
        </p>
      </section>

      <section id="exam" className="scroll-mt-24">
        <h2 className="mb-4 text-lg font-semibold">The exam</h2>
        {unlocked ? (
          <ChallengeRunner
            challenge={toClientChallenge(capstone)}
            signedIn={Boolean(user)}
            passed={passed}
          />
        ) : (
          <div className="card max-w-3xl p-6">
            <div className="flex items-start gap-4">
              <Lock className="mt-0.5 size-6 shrink-0 text-text-dim" />
              <div>
                <p className="font-semibold">Pass all {tracks.length} track gates to unlock the capstone</p>
                <p className="mt-1 text-sm text-text-muted">
                  {gatesPassed} of {tracks.length} gates passed.
                </p>
              </div>
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {tracks.map((t) => {
                const ok = t.gate ? progress.passed.has(t.gate.id) : false;
                return (
                  <li key={t.slug}>
                    <Link
                      href={`/tracks/${t.slug}${ok ? "" : "#gate"}`}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        ok ? "border-2 border-text bg-bg-raised font-medium" : "border-dashed border-border-strong text-text-muted hover:text-text"
                      }`}
                    >
                      {ok ? <CheckCircle2 className="size-4 shrink-0" aria-label="passed" /> : <Circle className="size-4 shrink-0" aria-label="not passed" />}
                      <span>
                        {t.order}. {getTrack(t.slug)?.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {passed && (
          <p className="mt-4 flex items-center gap-2 text-sm">
            <Award className="size-4" />
            Capstone passed.{" "}
            <Link href="/certificates" className="font-medium underline">
              See your certificates
            </Link>
          </p>
        )}
      </section>

      <section id="projects" className="scroll-mt-24">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">Portfolio projects</h2>
          <p className="mt-2 text-text-muted">
            The exam proves you can decide well. These projects prove you can build. Each one is a real piece of
            work to put on GitHub and talk through in an interview, with requirements you can tick off.
          </p>
          <p className="mt-3 rounded-lg border border-dashed border-border-strong px-4 py-3 text-sm text-text-muted">
            <strong className="text-text">Not graded.</strong> We cannot safely run what you build, so nothing here
            is scored, and the ticks are saved only in this browser. They do not count toward the certificate.
          </p>
        </div>

        <div className="mt-6 max-w-3xl space-y-3">
          {projects.map((p) => (
            <ProjectChecklist
              key={p.id}
              project={p}
              trackTitles={p.tracks.map((slug) => getTrack(slug)?.title ?? slug)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
