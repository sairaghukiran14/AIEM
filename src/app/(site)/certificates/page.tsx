import { Suspense } from "react";
import Link from "next/link";
import { Award, Download, ExternalLink, Lock } from "lucide-react";

import { tracks } from "@/content";
import { VerifyEmailBanner } from "@/components/VerifyEmail";
import { requireUser } from "@/lib/auth";
import { isVerificationRequired, reconcileIfAllowed } from "@/lib/email-verification";
import { formatIssueDate } from "@/lib/certificate-core";
import {
  COURSE_TITLE,
  listCertificates,
  type CertificateView,
} from "@/lib/certificates";

import { CertificatesSkeleton } from "./CertificatesSkeleton";

export const metadata = { title: "My certificates" };

function EarnedActions({ cert }: { cert: CertificateView }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/verify/${cert.certId}`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
        <ExternalLink className="size-3.5" /> View
      </Link>
      <a href={`/api/certificates/${cert.certId}/pdf`} download className="btn btn-primary !px-3 !py-1.5 !text-xs">
        <Download className="size-3.5" /> PDF
      </a>
    </div>
  );
}

export default async function CertificatesPage() {
  // Redirect before streaming starts, so a signed-out visit still gets a real redirect.
  const user = await requireUser("/certificates");
  return (
    <Suspense fallback={<CertificatesSkeleton />}>
      <CertificatesContent user={user} />
    </Suspense>
  );
}

async function CertificatesContent({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {

  let certs: CertificateView[] = [];
  let unavailable = false;
  try {
    // Fill any gap first (idempotent): covers gates passed before certificates
    // existed, or an issue that failed at the moment of passing.
    await reconcileIfAllowed(user.id, user.name);
    certs = await listCertificates(user.id);
  } catch {
    unavailable = true;
  }

  const course = certs.find((c) => c.kind === "course");
  const byTrack = new Map(certs.filter((c) => c.kind === "track").map((c) => [c.trackSlug, c]));
  const earnedTracks = tracks.filter((t) => byTrack.has(t.slug)).length;

  return (
    <div className="space-y-10">
      {isVerificationRequired() && !user.emailVerified && <VerifyEmailBanner email={user.email} />}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">My certificates</h1>
        <p className="mt-1 max-w-2xl text-text-muted">
          Pass a track&apos;s gate to earn that track&apos;s certificate. Pass all {tracks.length} gates and the
          capstone to earn the course certificate. Each one has a public link and a PDF.
        </p>
        <p className="mt-3 text-sm font-medium">
          {earnedTracks} of {tracks.length} track certificates earned
        </p>
      </header>

      {unavailable && (
        <p role="alert" className="rounded-lg border border-dashed border-text-dim px-4 py-3 text-sm text-text-muted">
          We could not load your certificates just now. Please refresh in a moment.
        </p>
      )}

      <section aria-labelledby="course-cert">
        <h2 id="course-cert" className="mb-3 text-lg font-semibold">
          Course certificate
        </h2>
        {course ? (
          <div className="card flex flex-wrap items-center justify-between gap-4 border-2 !border-text p-5">
            <div className="flex items-center gap-4">
              <Award className="size-8 shrink-0" />
              <div>
                <p className="font-semibold">{course.title}</p>
                <p className="text-sm text-text-muted">
                  Average gate score {course.score}% · issued {formatIssueDate(course.issuedAt)}
                </p>
                <p className="mt-0.5 font-mono text-xs text-text-dim">{course.certId}</p>
              </div>
            </div>
            <EarnedActions cert={course} />
          </div>
        ) : (
          <div className="card flex items-center gap-4 border-dashed p-5">
            <Lock className="size-6 shrink-0 text-text-dim" />
            <div>
              <p className="font-medium">{COURSE_TITLE}</p>
              <p className="text-sm text-text-muted">
                Pass all {tracks.length} track gates ({tracks.length - earnedTracks} to go) and the{" "}
                <Link href="/capstone" className="font-medium text-text underline">
                  capstone
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="track-certs">
        <h2 id="track-certs" className="mb-3 text-lg font-semibold">
          Track certificates
        </h2>
        <ul className="space-y-3">
          {tracks.map((track) => {
            const cert = byTrack.get(track.slug);
            return (
              <li key={track.slug}>
                {cert ? (
                  <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">
                        <span className="mr-2 text-text-dim">{track.order}.</span>
                        {cert.title}
                      </p>
                      <p className="text-sm text-text-muted">
                        Gate score {cert.score}% · issued {formatIssueDate(cert.issuedAt)}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-text-dim">{cert.certId}</p>
                    </div>
                    <EarnedActions cert={cert} />
                  </div>
                ) : (
                  <div className="card flex flex-wrap items-center justify-between gap-4 border-dashed p-4 text-text-muted">
                    <div className="flex items-center gap-3">
                      <Lock className="size-4 shrink-0" />
                      <p>
                        <span className="mr-2 text-text-dim">{track.order}.</span>
                        {track.title}
                      </p>
                    </div>
                    <Link href={`/tracks/${track.slug}#gate`} className="text-sm font-medium text-text hover:underline">
                      Go to the gate
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-text-dim">
        The name on a certificate is the name on your account when you passed. Anyone with a certificate&apos;s
        link can see that name, the credential, the score and the date.
      </p>
    </div>
  );
}
