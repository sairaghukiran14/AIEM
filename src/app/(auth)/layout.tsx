import { LogoMark } from "@/components/Logo";
import Link from "next/link";

import { courseTotals } from "@/content";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-card">
      {/* Brand panel */}
      <aside className="hidden w-1/2 flex-col justify-between border-r border-border-base bg-bg-raised p-10 lg:flex">
        <Link href="/" aria-label="AIEM home" className="inline-flex w-fit">
          <LogoMark size="md" />
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            From &ldquo;what&apos;s a token?&rdquo; to shipping agents in production.
          </h2>
          <p className="mt-4 text-text-muted">
            Interactive visuals, scored challenges and an interview corner on every lesson.
            Work through the tracks in order, passing each gate to unlock the next.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-4 border-t border-border-base pt-6 text-sm">
          {[
            [courseTotals.tracks, "tracks"],
            [courseTotals.lessons, "lessons live"],
            [courseTotals.challenges, "challenges live"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="text-2xl font-semibold">{value}</dt>
              <dd className="text-text-dim">{label}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" aria-label="AIEM home" className="mb-8 inline-flex lg:hidden">
            <LogoMark size="sm" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
