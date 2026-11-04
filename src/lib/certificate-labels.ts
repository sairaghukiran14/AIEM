import { tracks } from "@/content";
import type { CertificateView } from "@/lib/certificates";

/** The line under the credential title, shared by the page and the PDF so they always agree. */
export function certificateSubtitle(cert: Pick<CertificateView, "kind" | "trackSlug" | "score">): string {
  if (cert.kind === "course") {
    return `All ${tracks.length} tracks and the capstone passed · capstone score ${cert.score}%`;
  }
  const order = tracks.find((t) => t.slug === cert.trackSlug)?.order;
  return `Track ${order ?? "?"} of ${tracks.length} · gate score ${cert.score}%`;
}

/** What the seal on a certificate shows: the track number and level, or a star for the course. */
export function certificateBadge(
  cert: Pick<CertificateView, "kind" | "trackSlug">
): { kind: "track" | "course"; number?: number; level?: string } {
  if (cert.kind === "course") return { kind: "course" };
  const track = tracks.find((t) => t.slug === cert.trackSlug);
  return { kind: "track", number: track?.order, level: track?.level };
}
