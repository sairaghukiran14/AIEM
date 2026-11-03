import { tracks } from "@/content";
import type { CertificateView } from "@/lib/certificates";

/** The line under the credential title, shared by the page and the PDF so they always agree. */
export function certificateSubtitle(cert: Pick<CertificateView, "kind" | "trackSlug" | "score">): string {
  if (cert.kind === "course") {
    return `All ${tracks.length} tracks passed · average gate score ${cert.score}%`;
  }
  const order = tracks.find((t) => t.slug === cert.trackSlug)?.order;
  return `Track ${order ?? "?"} of ${tracks.length} · gate score ${cert.score}%`;
}
