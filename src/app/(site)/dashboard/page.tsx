import Link from "next/link";
import { Award, Flame, Trophy, Zap } from "lucide-react";

import { courseTotals, publishedTracks, tracks, trackXp } from "@/content";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { isTrackUnlocked, loadProgress, trackCompletion } from "@/lib/progress";
import { Submission } from "@/models/Submission";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const progress = await loadProgress(user.id);

  let recent: { challengeId: string; score: number; maxScore: number; passed: boolean; createdAt: Date }[] = [];
  try {
    await connectDB();
    recent = await Submission.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("challengeId score maxScore passed createdAt")
      .lean();
  } catch {
    // Recent activity is non-essential; the rest of the page still renders.
  }

  // Resume where the user left off: the first unfinished lesson in the first unlocked track.
  let resumeTrack: (typeof publishedTracks)[number] | undefined;
  let resumeLesson: (typeof publishedTracks)[number]["lessons"][number] | undefined;
  for (const track of publishedTracks) {
    if (!isTrackUnlocked(track.slug, progress)) continue;
    const next = track.lessons.find((l) => !progress.completedLessons.has(l.slug));
    if (next) {
      resumeTrack = track;
      resumeLesson = next;
      break;
    }
  }

  const stats = [
    { icon: Zap, label: "Total XP", value: user.xp, tone: "text-amber" },
    { icon: Flame, label: "Day streak", value: user.streakCount, tone: "text-pink" },
    { icon: Trophy, label: "Challenges passed", value: progress.passed.size, tone: "text-green" },
    { icon: Award, label: "Badges", value: user.badges.length, tone: "text-accent-soft" },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-text-muted">
          {progress.completedLessons.size} of {courseTotals.lessons} available lessons complete.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="card p-4">
            <Icon className={`mb-2 size-5 ${tone}`} />
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-sm text-text-dim">{label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card flex flex-col justify-between gap-3 p-5">
          <div>
            <p className="font-semibold">Practise for interviews</p>
            <p className="mt-1 text-sm text-text-muted">
              Answer real interview questions in your own words, then compare with a strong answer. Or take the
              placement check to find where to focus.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/interview" className="btn btn-ghost">
              Mock interview
            </Link>
            <Link href="/assess" className="btn btn-ghost">
              Placement check
            </Link>
          </div>
        </div>
        <div className="card flex flex-col justify-between gap-3 p-5">
          <div>
            <p className="font-semibold">Capstone</p>
            <p className="mt-1 text-sm text-text-muted">
              Thirty-six decisions on one case study. Opens after all {tracks.length} track gates and, with them,
              earns the course certificate.
            </p>
          </div>
          <Link href="/capstone" className="btn btn-ghost self-start">
            Open the capstone
          </Link>
        </div>
        <div className="card flex flex-col justify-between gap-3 p-5">
          <div>
            <p className="font-semibold">Certificates</p>
            <p className="mt-1 text-sm text-text-muted">
              One for each track gate you pass, and a course certificate after the capstone.
            </p>
          </div>
          <Link href="/certificates" className="btn btn-ghost self-start">
            View my certificates
          </Link>
        </div>
      </section>

      {resumeTrack && resumeLesson && (
        <section className="card flex flex-wrap items-center justify-between gap-4 border-accent/40 bg-accent-dim/30 p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-accent-soft">Continue learning</p>
            <p className="mt-1 text-lg font-semibold">{resumeLesson.title}</p>
            <p className="text-sm text-text-muted">{resumeTrack.title}</p>
          </div>
          <Link href={`/learn/${resumeTrack.slug}/${resumeLesson.slug}`} className="btn btn-primary">
            Resume
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Track progress</h2>
        <div className="space-y-3">
          {publishedTracks.map((track) => {
            const ids = [
              ...track.lessons.flatMap((l) => l.challenges.map((c) => c.id)),
              ...(track.gate ? [track.gate.id] : []),
            ];
            const pct = Math.round(trackCompletion(ids, progress) * 100);
            const earned = ids.reduce((sum, id) => {
              if (!progress.passed.has(id)) return sum;
              const all = [...track.lessons.flatMap((l) => l.challenges), ...(track.gate ? [track.gate] : [])];
              return sum + (all.find((c) => c.id === id)?.xp ?? 0);
            }, 0);

            return (
              <Link
                key={track.slug}
                href={`/tracks/${track.slug}`}
                className="card block p-4 transition-colors hover:bg-bg-hover"
              >
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{track.title}</span>
                  <span className="text-text-dim">
                    {earned}/{trackXp(track)} XP · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Badges</h2>
          {user.badges.length === 0 ? (
            <p className="text-sm text-text-muted">
              None yet — pass challenges, keep a streak or finish a track to earn them.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {user.badges.map((b) => (
                <li key={b.badgeId} className="chip !border-accent/50 !px-3 !py-1.5 !text-accent-soft">
                  <Award className="size-3.5" /> {b.label}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing yet. Start a lesson and pass a challenge.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {recent.map((s, i) => (
                <li key={i} className="flex justify-between rounded-lg bg-bg-card px-3 py-2">
                  <span className="font-mono text-text-muted">{s.challengeId}</span>
                  <span className={s.passed ? "text-green" : "text-red"}>
                    {s.score}/{s.maxScore} {s.passed ? "passed" : "failed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
