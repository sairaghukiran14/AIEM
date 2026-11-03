import { LogoMark } from "@/components/Logo";
import { formatIssueDate } from "@/lib/certificate-core";
import type { CertificateView } from "@/lib/certificates";

/** On-screen certificate, in the same grayscale style as the PDF. Prints cleanly. */
export function CertificateCard({ cert, subtitle }: { cert: CertificateView; subtitle: string }) {
  return (
    <figure
      className="mx-auto w-full max-w-3xl border-[3px] border-text bg-bg-card p-2 print:max-w-none"
      aria-label={`Certificate: ${cert.title}, awarded to ${cert.holderName}`}
    >
      <div className="flex flex-col items-center border border-border-base px-5 py-10 text-center sm:px-12 sm:py-14">
        <LogoMark size="lg" />

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-text-muted">
          Certificate of completion
        </p>

        <p className="mt-8 text-sm text-text-muted">This certifies that</p>
        <h2 className="mt-3 max-w-full break-words text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          {cert.holderName}
        </h2>
        <hr className="mt-4 w-3/5 border-border-strong" />

        <p className="mt-6 text-sm text-text-muted">has successfully completed</p>
        <p className="mt-3 text-xl font-bold leading-snug tracking-tight sm:text-3xl">{cert.title}</p>
        <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
        <p className="mt-6 text-sm text-text-muted">Issued on {formatIssueDate(cert.issuedAt)}</p>

        <div className="mt-10 flex w-full flex-wrap items-end justify-between gap-3 border-t border-border-base pt-4 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-dim">Certificate ID</p>
            <p className="font-mono text-sm font-bold">{cert.certId}</p>
          </div>
          <p className="max-w-xs text-right text-[10px] leading-relaxed text-text-dim">
            Issued by AIEM (AI Engineering Mastery) for completing its course material and passing its
            assessments. Not an accredited qualification.
          </p>
        </div>
      </div>
    </figure>
  );
}
