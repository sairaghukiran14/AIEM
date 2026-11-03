import "server-only";

import { randomBytes } from "node:crypto";

import { capstone, tracks } from "@/content";
import { allGatesPassed, certIdFromBytes, scorePercent } from "@/lib/certificate-core";
import { connectDB } from "@/lib/db";
import { getUserProgress } from "@/lib/progress";
import { Certificate, type CertificateDoc } from "@/models/Certificate";

export type CertificateView = {
  certId: string;
  holderName: string;
  kind: "track" | "course";
  trackSlug: string;
  title: string;
  /** Whole-number percent. */
  score: number;
  issuedAt: string;
};

export type IssuedCertificate = Pick<CertificateView, "certId" | "kind" | "title"> & { created: boolean };

export const COURSE_TITLE = "AI Engineering Mastery: Complete Course";

function toView(doc: CertificateDoc): CertificateView {
  return {
    certId: doc.certId,
    holderName: doc.holderName,
    kind: doc.kind === "course" ? "course" : "track",
    trackSlug: doc.trackSlug ?? "",
    title: doc.title,
    score: doc.finalScore,
    issuedAt: new Date(doc.issuedAt).toISOString(),
  };
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

/**
 * Creates the certificate if this person does not already have it. Safe to call
 * repeatedly and from concurrent requests: the unique (user, kind, track) index
 * decides, and the loser of a race simply reads the winner's certificate.
 */
async function ensureCertificate(
  userId: string,
  kind: "track" | "course",
  trackSlug: string,
  data: { holderName: string; title: string; score: number }
): Promise<IssuedCertificate> {
  const filter = { userId, kind, trackSlug };

  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await Certificate.findOne(filter).lean<CertificateDoc>();
    if (existing) return { certId: existing.certId, kind, title: existing.title, created: false };

    try {
      const created = await Certificate.create({
        ...filter,
        certId: certIdFromBytes(randomBytes(12)),
        holderName: data.holderName,
        title: data.title,
        finalScore: data.score,
        issuedAt: new Date(),
      });
      return { certId: created.certId, kind, title: created.title, created: true };
    } catch (err) {
      // Either another request created this person's certificate a moment ago
      // (the loop re-reads it) or, vanishingly rarely, the random id collided
      // (the loop tries a new id).
      if (!isDuplicateKey(err)) throw err;
    }
  }
  throw new Error("Could not issue certificate");
}

/**
 * Issues every certificate this person has earned and does not yet hold: one per
 * passed track gate, and the course certificate once all gates and the capstone are passed.
 *
 * Idempotent, so it is safe to call after every gate pass and whenever the
 * certificates page loads. That makes it self-healing: if issuing failed at the
 * moment of passing, or someone passed gates before certificates existed, the
 * next call fills the gap. Returns every certificate held for the gates passed,
 * with `created` marking the ones issued by this call.
 */
export async function reconcileCertificates(userId: string, holderName: string): Promise<IssuedCertificate[]> {
  await connectDB();
  const progress = await getUserProgress(userId);
  const issued: IssuedCertificate[] = [];

  const gated = tracks.filter((t) => t.gate);
  for (const track of gated) {
    if (!progress.passed.has(track.gate!.id)) continue;
    issued.push(
      await ensureCertificate(userId, "track", track.slug, {
        holderName,
        title: track.title,
        score: scorePercent(progress.best.get(track.gate!.id) ?? 0, 1),
      })
    );
  }

  // The course certificate needs every track gate AND the capstone. Its score is
  // the capstone score, the one assessment that spans the whole course.
  const gateIds = gated.map((t) => t.gate!.id);
  if (allGatesPassed([...gateIds, capstone.id], progress.passed)) {
    issued.push(
      await ensureCertificate(userId, "course", "", {
        holderName,
        title: COURSE_TITLE,
        score: scorePercent(progress.best.get(capstone.id) ?? 0, 1),
      })
    );
  }

  return issued;
}

export async function getCertificate(certId: string): Promise<CertificateView | null> {
  await connectDB();
  const doc = await Certificate.findOne({ certId }).lean<CertificateDoc>();
  return doc ? toView(doc) : null;
}

export async function listCertificates(userId: string): Promise<CertificateView[]> {
  await connectDB();
  const docs = await Certificate.find({ userId }).sort({ issuedAt: 1 }).lean<CertificateDoc[]>();
  return docs.map(toView);
}
