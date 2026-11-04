import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ShieldAlert, ShieldCheck } from "lucide-react";

import { CertificateCard } from "@/components/CertificateCard";
import { PrintButton } from "@/components/PrintButton";
import { formatIssueDate, isValidCertId } from "@/lib/certificate-core";
import { certificateBadge, certificateSubtitle } from "@/lib/certificate-labels";
import { getCertificate, type CertificateView } from "@/lib/certificates";

type Props = { params: Promise<{ certId: string }> };

// Verification pages are for people who were handed the link, not for search engines.
export const metadata = { title: "Verify certificate", robots: { index: false, follow: false } };

export default async function VerifyPage({ params }: Props) {
  // IDs are upper case; accept a lower-case paste too.
  const certId = (await params).certId.toUpperCase();
  if (!isValidCertId(certId)) notFound();

  let cert: CertificateView | null;
  try {
    cert = await getCertificate(certId);
  } catch {
    // A database problem is not the same as "this certificate is fake", so say so.
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 size-8 text-text-dim" />
        <h1 className="text-xl font-semibold">Verification is temporarily unavailable</h1>
        <p className="mt-2 text-sm text-text-muted">
          We could not reach our records just now. This does not mean the certificate is invalid.
          Please try again in a few minutes.
        </p>
      </div>
    );
  }
  if (!cert) notFound();

  const subtitle = certificateSubtitle(cert);

  return (
    <div className="space-y-8">
      <section className="mx-auto flex max-w-3xl items-start gap-4 rounded-xl border-2 border-text bg-bg-raised p-5 print:hidden">
        <ShieldCheck className="mt-0.5 size-6 shrink-0" />
        <div>
          <h1 className="text-lg font-semibold">Verified: this certificate is genuine</h1>
          <p className="mt-1 text-sm text-text-muted">
            AIEM issued this certificate to <strong className="text-text">{cert.holderName}</strong> on{" "}
            {formatIssueDate(cert.issuedAt)} for <strong className="text-text">{cert.title}</strong>, with a
            {cert.kind === "course" ? " capstone" : " gate"} score of {cert.score}%.
          </p>
        </div>
      </section>

      <CertificateCard cert={cert} subtitle={subtitle} badge={certificateBadge(cert)} />

      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 print:hidden">
        <a href={`/api/certificates/${cert.certId}/pdf`} download className="btn btn-primary">
          <Download className="size-4" /> Download PDF
        </a>
        <PrintButton />
        <Link href="/verify" className="text-sm font-medium text-text-muted hover:text-text">
          Verify another certificate
        </Link>
      </div>

      <p className="mx-auto max-w-3xl text-xs leading-relaxed text-text-dim print:hidden">
        A certificate shows that this person completed the AIEM course material and passed its assessments.
        It is not an accredited qualification. Anyone with this link can see the name, credential, score and
        date above.
      </p>
    </div>
  );
}
